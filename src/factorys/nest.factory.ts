// deno-lint-ignore-file no-explicit-any
import { Application, Reflect } from "../../deps.ts";
import { getModuleMetadata, isModule } from "../decorators/module.ts";
import { ModuleType, Provider, Scope, Type } from "../interfaces/mod.ts";
import { Router } from "../router.ts";
import { initProvider } from "./class.factory.ts";

const onModuleInitedKey = Symbol("onModuleInited");

export type ApplicationEx = Application & {
  setGlobalPrefix: typeof Router.prototype.setGlobalPrefix;
  routes: typeof Router.prototype.routes;
  get: typeof Router.prototype.get;
  use: typeof Router.prototype.use;
  useGlobalInterceptors: typeof Router.prototype.useGlobalInterceptors;
  router: Router;
};

export async function findControllers(
  module: ModuleType,
  controllerArr: Type<any>[],
  registeredProviderArr: Provider[],
  dynamicProviders: Provider[],
) {
  if (!isModule(module)) {
    return;
  }
  const isDynamicModule = "module" in module;
  const imports = isDynamicModule
    ? module.imports
    : getModuleMetadata("imports", module);

  const controllers = isDynamicModule
    ? module.controllers
    : getModuleMetadata("controllers", module);
  const providers = isDynamicModule
    ? module.providers
    : getModuleMetadata("providers", module);
  // const exports = isDynamicModule
  //   ? module.exports
  //   : getModuleMetadata("exports", module); // TODO donnot think well how to use exports
  if (controllers) {
    controllerArr.push(...controllers);
  }
  if (providers) {
    if (isDynamicModule) {
      dynamicProviders.push(...providers);
    } else {
      registeredProviderArr.push(...providers);
    }
  }
  if (!imports || !imports.length) {
    return;
  }
  await Promise.all(imports.map(async (item: any) => {
    if (!item) {
      return;
    }
    const module = await item;
    return findControllers(
      module,
      controllerArr,
      registeredProviderArr,
      dynamicProviders,
    );
  }));
}

export async function initProviders(providers: Provider[]) {
  const arr = [];
  for (const provider of providers) {
    const instance = await initProvider(provider, Scope.DEFAULT);
    if (instance) {
      arr.push({
        instance,
        provider,
      });
    }
  }
  return Promise.all(arr.map(({ instance, provider }) => {
    if (typeof instance.onModuleInit === "function") {
      if (Reflect.hasOwnMetadata(onModuleInitedKey, provider)) {
        return;
      }
      Reflect.defineMetadata(onModuleInitedKey, true, provider);
      return instance.onModuleInit();
    }
  }));
}

export class NestFactory {
  static async create(module: ModuleType) {
    const app = new Application() as ApplicationEx;
    const router = new Router();
    const controllers: Type<any>[] = [];
    const registeredProviders: Provider<any>[] = [];
    const dynamicProviders: Provider<any>[] = [];
    await findControllers(
      module,
      controllers,
      registeredProviders,
      dynamicProviders,
    );
    await initProviders(dynamicProviders); // init dynamic providers first to avoid it be inited first by other providers
    await initProviders(registeredProviders);

    if (controllers.length) {
      await router.add(...controllers);
    }

    // bind router methods to app
    app.setGlobalPrefix = router.setGlobalPrefix.bind(router);
    app.get = router.get.bind(router);
    app.routes = router.routes.bind(router);
    app.useGlobalInterceptors = router.useGlobalInterceptors.bind(router);
    app.router = router;
    return app;
  }
}
