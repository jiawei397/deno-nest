// deno-lint-ignore-file no-explicit-any
import {
  blue,
  format,
  green,
  red,
  Reflect,
  type StatusCode,
  yellow,
} from "./deps.ts";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "./constants.ts";
import {
  META_HEADER_KEY,
  META_HTTP_CODE_KEY,
} from "./decorators/controller.ts";
import { isDynamicModule, onModuleInit } from "./decorators/module.ts";
import { ForbiddenException, NotFoundException } from "./exceptions.ts";
import { factory } from "./factorys/class.factory.ts";
import { checkByFilters, DefaultGlobalExceptionFilter } from "./filter.ts";
import { checkByGuard } from "./guard.ts";
import { checkByInterceptors } from "./interceptor.ts";
import type {
  ListenOptions,
  ShutdownSignal,
} from "./interfaces/application.interface.ts";
import type { Context } from "./interfaces/context.interface.ts";
import type {
  FactoryCaches,
  StaticOptions,
} from "./interfaces/factory.interface.ts";
import type { ExceptionFilters } from "./interfaces/filter.interface.ts";
import type {
  ControllerMethod,
  NestGuards,
} from "./interfaces/guard.interface.ts";
import type { NestUseInterceptors } from "./interfaces/interceptor.interface.ts";
import type { LoggerService } from "./interfaces/log.interface.ts";
import type {
  CollectResult,
  ModuleType,
} from "./interfaces/module.interface.ts";
import type { Provider } from "./interfaces/provider.interface.ts";
import type { IRouter, RouteMap } from "./interfaces/route.interface.ts";
import type { Constructor, Type } from "./interfaces/type.interface.ts";
import {
  collectModuleDeps,
  isClassProvider,
  isSpecialProvider,
  sortModuleDeps,
} from "./module.ts";
import { transferParam } from "./params.ts";
import {
  getControllerPaths,
  getMethodPaths,
  storeCronInstance,
} from "./utils.ts";
import type {
  INestMiddleware,
  NestMiddleware,
} from "./interfaces/middleware.interface.ts";

export class Application {
  private apiPrefix = "";
  private staticOptions: StaticOptions;
  private globalInterceptors: NestUseInterceptors = [];
  private globalExceptionFilters: ExceptionFilters = [
    DefaultGlobalExceptionFilter,
  ];
  private globalGuards: NestGuards = [];

  private abortController: AbortController = new AbortController();
  private instances = new Set<any>();
  private controllers: Type[] = [];

  private logger: LoggerService | false = console;
  private startTime = Date.now();

  moduleCaches: Map<ModuleType, FactoryCaches> = new Map();

  constructor(protected router: IRouter) {}

  setGlobalPrefix(apiPrefix: string) {
    this.apiPrefix = apiPrefix;
  }

  /**
   * Only give a simple quick start example here, not recommended to use it for complex functions.
   *
   * Because it is not subject to the overall framework process framework and is not associated with guards, interceptors, filters, etc.
   *
   * Its execution order with middleware is also not guaranteed by the framework, for example, oak middleware will be executed first, but the hono may see the order `get` and middlewares.
   */
  get(path: string, middleware: NestMiddleware) {
    this.router.get(path, async (ctx, next) => {
      const result = await middleware(ctx.request, ctx.response, next);
      if (ctx.response.body === undefined && result !== undefined) {
        ctx.response.body = result;
      }
    });
  }

  isConstructorMiddleware(
    middleware: NestMiddleware | Constructor<INestMiddleware>,
  ): middleware is Constructor<INestMiddleware> {
    return typeof middleware === "function" && middleware.prototype &&
      "use" in middleware.prototype;
  }

  /**
   * use middlewares
   *
   * @warning If use `class` middleware, the `use` method is `async` and should use `await` outside the `use` method.
   * Such as:
   * ```ts
   * await app.use(SessionMiddleware)
   * ```
   */
  async use(
    ...middlewares: (NestMiddleware | Constructor<INestMiddleware>)[]
  ): Promise<void> {
    for (const middleware of middlewares) {
      if (this.isConstructorMiddleware(middleware)) {
        const mid = await factory.getInstance<INestMiddleware>(middleware);
        this.router.use(async (ctx, next) => {
          await mid.use(ctx.request, ctx.response, next);
        });
      } else {
        this.router.use(async (ctx, next) => {
          await middleware(ctx.request, ctx.response, next);
        });
      }
    }
  }

  /**
   * use the origin middleware, not recommend to use if you don't know what you are doing.
   * @param originMiddleware the hono middleware or oak middleware
   * @param [path] the path to use the middleware, this only work for hono middleware
   */
  // deno-lint-ignore ban-types
  useOriginMiddleware(originMiddleware: Function, path?: string): void {
    this.router.useOriginMiddleware(originMiddleware, path);
  }

  async listen(options?: ListenOptions): Promise<void> {
    await this.routes();
    this.router.routes();
    this.router.serveForStatic(this.staticOptions);
    await this.onApplicationBootstrap();
    return new Promise((resolve) => {
      this.router.startServer({
        signal: this.abortController.signal,
        ...options,
        onListen: (params) => {
          if (options?.onListen) {
            options?.onListen(params);
          } else {
            this.log(
              yellow("[NestApplication]"),
              green("Server started at"),
              `http://${params.hostname}:${params.port}`,
            );
          }
          resolve();
        },
      });
      this.log(
        yellow("[NestApplication]"),
        green(
          `Nest application successfully started ${
            Date.now() - this.startTime
          }ms`,
        ),
      );
    });
  }

  /**
   * Close the application.
   * @param [signal] The signal which caused the shutdown.
   */
  async close(signal?: ShutdownSignal) {
    this.log("Closing Nest application...");
    this.log("Module destroy start...");
    await this.onModuleDestroy().catch(this.log.bind(this));
    this.log("Before application shutdown start...");
    await this.beforeApplicationShutdown(signal);
    this.abortController.abort();
    this.log("Application shutdown...");
    await this.onApplicationShutdown(signal);
    this.log("Nest application closed complete");
  }

  /**
   * Enables the usage of shutdown hooks. Will call the
   * `onApplicationShutdown` function of a provider if the
   * process receives a shutdown signal.
   *
   * @param {ShutdownSignal[]} [signals=[]] The system signals it should listen to
   *
   * @returns {this} The Nest application context instance
   */
  public enableShutdownHooks(signals: ShutdownSignal[] = ["SIGINT"]): this {
    let currentSignal: ShutdownSignal | "" = "";
    new Set(signals).forEach((signal) => {
      const callback = async () => {
        if (currentSignal) {
          return;
        }
        currentSignal = signal;
        Deno.removeSignalListener(signal, callback);
        this.log(`${signal} received`);
        await this.close(signal);
        this.log(`The Deno process will shutdown in 500ms.`);
        setTimeout(() => {
          if (Deno.env.get("DENO_ENV") !== "test") {
            Deno.exit();
          }
        }, 500);
      };
      Deno.addSignalListener(signal, callback);
    });
    return this;
  }

  useGlobalInterceptors(...interceptors: NestUseInterceptors) {
    this.globalInterceptors.push(...interceptors);
  }

  useGlobalFilters(...filters: ExceptionFilters) {
    this.globalExceptionFilters.push(...filters);
  }

  useGlobalGuards(...guards: NestGuards) {
    this.globalGuards.push(...guards);
  }

  /**
   * Sets custom logger service.
   * @returns {void}
   */
  useLogger(logger: LoggerService | false): void {
    this.logger = logger;
  }

  /**
   * Sets a base directory for public assets.
   * @example
   * app.useStaticAssets('public')
   */
  useStaticAssets(path: string, options?: {
    prefix?: string;
  }) {
    this.staticOptions = {
      baseDir: path,
      ...options,
    };
  }

  /**
   * add controller
   * @protected not recommend to alone use
   */
  addController(...clsArr: Type[]) {
    this.controllers.push(...clsArr);
  }

  protected log(...message: string[]) {
    if (!this.logger) return;
    this.logger.info(
      yellow("[Nest]"),
      green(format(new Date(), "yyyy-MM-dd HH:mm:ss")),
      ...message,
    );
  }

  private async formatResponse(
    context: Context,
    options: {
      target: InstanceType<Constructor>;
      args: any[];
      methodName: string;
      methodType: string; // get/post/put/delete
      fn: ControllerMethod;
    },
  ) {
    // format response body
    if (context.response.status === 304) {
      context.response.body = null;
    } else if (context.response.body !== undefined) {
      const body = context.response.body;
      if (body instanceof Promise) {
        context.response.body = await body;
      }
    }

    // response headers
    const headers: Record<string, string> = Reflect.getMetadata(
      META_HEADER_KEY,
      options.fn,
    );
    if (headers) {
      Object.keys(headers).forEach((key) => {
        context.response.headers.set(key, headers[key]);
      });
    }

    // response http code
    const code: StatusCode = Reflect.getMetadata(
      META_HTTP_CODE_KEY,
      options.fn,
    );
    if (code) {
      context.response.status = code;
    }
  }

  private async validateGuard(
    target: InstanceType<Constructor>,
    fn: ControllerMethod,
    context: Context,
  ): Promise<boolean> {
    try {
      const passed = await checkByGuard(target, fn, context, this.globalGuards);
      if (!passed) {
        throw new ForbiddenException("");
      }
      return true;
    } catch (error) {
      await this.catchFilter(target, fn, context, error);
      return false;
    }
  }

  private async catchFilter(
    target: InstanceType<Constructor> | null,
    fn: ControllerMethod | null,
    context: Context,
    error: any,
  ) {
    await checkByFilters(
      context,
      target,
      this.globalExceptionFilters,
      fn,
      error,
    );
  }

  protected async routes() {
    const routerArr = await factory.getRouterArr(this.controllers);
    let num = 0;
    const start = Date.now();
    routerArr.forEach(
      ({ controllerPath, arr, aliasOptions: controllerAliasOptions }) => {
        const { controllerPathWithPrefix, controllerAliasPath } =
          getControllerPaths({
            prefix: this.apiPrefix,
            controllerPath,
            controllerAliasOptions,
          });

        const startTime = Date.now();
        let lastCls;

        arr.forEach((routeMap: RouteMap) => {
          const {
            methodPath,
            aliasOptions,
            methodType,
            fn,
            methodName,
            instance,
            cls,
          } = routeMap;
          lastCls = cls;
          const { originPath, aliasPath } = getMethodPaths({
            apiPrefix: this.apiPrefix,
            controllerPath,
            controllerPathWithPrefix,
            controllerAliasPath,
            methodPath,
            methodAliasOptions: aliasOptions,
          });
          const funcStart = Date.now();
          const callback = async (context: Context) => {
            // validate guard
            if ((await this.validateGuard(instance, fn, context)) === false) {
              return;
            }

            // transfer params
            let args: any[];
            try {
              args = await transferParam(instance, methodName, context);
            } catch (error) {
              await this.catchFilter(instance, fn, context, error);
              return;
            }

            // call controller method
            try {
              const next = async () => {
                const result = await fn.apply(instance, args);
                if (
                  result !== undefined
                  // (context.response.body === null || // if set by ctx.response.body, don't return again
                  // context.response.body === undefined)
                ) {
                  context.response.body = result;
                }
                return result;
              };
              await checkByInterceptors(context, this.globalInterceptors, fn, {
                target: instance,
                methodName,
                methodType,
                args,
                fn,
                next,
              });
            } catch (error) {
              await this.catchFilter(instance, fn, context, error);
            }

            await this.formatResponse(context, {
              fn,
              target: instance,
              methodType,
              args,
              methodName,
            });
            // console.log(context.res.body, result);
          };

          if (originPath) {
            this.router[methodType](originPath, callback);
            num++;
          }

          if (aliasPath) {
            this.router[methodType](aliasPath, callback);
            num++;
          }
          const funcEnd = Date.now();
          const path = (originPath && aliasPath)
            ? originPath + ", " + red(aliasPath)
            : aliasPath
            ? red(aliasPath)
            : originPath;
          this.log(
            yellow("[RouterExplorer]"),
            green(
              `Mapped {${path || "/"}, ${methodType.toUpperCase()}} route ${
                funcEnd - funcStart
              }ms`,
            ),
          );
        });

        const endTime = Date.now();
        const name = lastCls?.["name"];
        this.log(
          red("[RoutesResolver]"),
          blue(
            `${name} ${
              controllerPathWithPrefix || red(controllerAliasPath || "")
            } ${endTime - startTime}ms`,
          ),
        );
      },
    );
    this.log(
      yellow("[RoutesResolver]"),
      green(
        `Mapped ${red(num.toString())} routes with ${Date.now() - start}ms`,
      ),
    );

    // deal global not found
    this.router.notFound(async (ctx) => {
      await this.catchFilter(null, null, ctx, new NotFoundException(""));
    });
  }

  private async initModule(module: ModuleType) {
    const isDynamic = isDynamicModule(module);
    if (isDynamic) {
      return module;
    } else {
      const instance = await factory.create(module);
      return instance;
    }
  }

  private async initProviders(providers: Provider[], caches: FactoryCaches) {
    for (const provider of providers) {
      const instance = await factory.initProvider(provider, { caches });
      if (!instance) { // if use factory or useValue, the instance may be undefined
        continue;
      }
      this.instances.add(instance);
      // register global interceptor, filter, guard
      if (isSpecialProvider(provider)) {
        const provide = provider.provide;
        if (provide === APP_INTERCEPTOR) {
          this.useGlobalInterceptors(instance);
        } else if (provide === APP_FILTER) {
          this.useGlobalFilters(instance);
        } else if (provide === APP_GUARD) {
          this.useGlobalGuards(instance);
        } else if (isClassProvider(provider)) {
          storeCronInstance(provider.useClass, instance);
        }
      } else {
        storeCronInstance(provider, instance);
      }
    }
  }

  private async initControllers(
    controllerArr: Constructor[],
    caches: FactoryCaches,
  ) {
    await Promise.all(
      controllerArr.map(async (controller) => {
        const instance = await factory.create(controller, { caches });
        this.instances.add(instance);
        factory.instanceCaches.set(instance, caches); // add to module caches
        factory.globalCaches.set(controller, instance); // add to global caches
      }),
    );
  }

  private async initModules(
    moduleMap: Map<ModuleType, CollectResult>,
    modules: ModuleType[],
  ) {
    for (const module of modules) {
      const {
        controllerArr,
        providerArr,
        exportsArr,
        childModuleArr,
        cache: moduleCache,
        global,
      } = moduleMap.get(module)!;

      this.moduleCaches.set(module, moduleCache);

      if (childModuleArr.length) {
        childModuleArr.forEach((childModule) => {
          const { exportsArr: childExportsArr, cache: childModuleCache } =
            moduleMap.get(childModule)!;
          childExportsArr.forEach((item) => {
            factory.copyProviderCache(item, childModuleCache, moduleCache);
          });
        });
      }
      await this.initProviders(providerArr, moduleCache);
      if (global) {
        exportsArr.forEach((item) => {
          factory.copyProviderCache(item, moduleCache, factory.globalCaches);
        });
      }
      this.controllers.push(...controllerArr);
      await this.initControllers(controllerArr, moduleCache);
    }
    await Promise.all(
      modules.map(async (module) => {
        const instance = await this.initModule(module);
        this.instances.add(instance);
      }),
    );

    await this.onModuleInit();
  }

  async init(appModule: ModuleType, caches?: FactoryCaches) {
    factory.reset();
    if (caches) {
      factory.globalCaches = caches;
    }

    this.log(yellow("[NestFactory]"), green(`Starting Nest application...`));
    const start = Date.now();
    const moduleMap = new Map<ModuleType, CollectResult>();
    await collectModuleDeps(
      appModule,
      moduleMap,
    );
    const moduleDepsArr = sortModuleDeps(moduleMap);
    this.log(
      yellow("[InstanceLoader]"),
      green(`AppModule dependencies collected ${Date.now() - start}ms`),
    );

    const startInit = Date.now();
    await this.initModules(moduleMap, moduleDepsArr);
    this.log(
      yellow("[InstanceLoader]"),
      green(`AppModule dependencies initialized ${Date.now() - startInit}ms`),
    );
  }

  private async onModuleInit(): Promise<void> {
    for await (const instance of this.instances) {
      await onModuleInit(instance);
    }
  }

  /**
   * TODO: think about whether to use Promise.all or a for loop
   */
  private async onApplicationBootstrap(): Promise<void> {
    await Promise.all(
      [...this.instances].map((instance) => {
        if (typeof instance.onApplicationBootstrap === "function") {
          return instance.onApplicationBootstrap();
        }
      }),
    );
  }

  /**
   * TODO: think about whether to use Promise.all or a for loop
   */
  private async onApplicationShutdown(signal?: string): Promise<void> {
    await Promise.all(
      [...this.instances].map((instance) => {
        if (typeof instance.onApplicationShutdown === "function") {
          return instance.onApplicationShutdown(signal);
        }
      }),
    );
  }

  private async beforeApplicationShutdown(signal?: string): Promise<void> {
    await Promise.all(
      [...this.instances].map((instance) => {
        if (typeof instance.beforeApplicationShutdown === "function") {
          return instance.beforeApplicationShutdown(signal);
        }
      }),
    );
  }

  private async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.instances].map((instance) => {
        if (typeof instance.onModuleDestroy === "function") {
          return instance.onModuleDestroy();
        }
      }),
    );
  }
}
