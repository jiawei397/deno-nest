// deno-lint-ignore-file no-explicit-any ban-types
import type { ListenOptions } from "./application.interface.ts";
import type { Context } from "./context.interface.ts";
import type { AliasOptions } from "./controller.interface.ts";
import type { StaticOptions } from "./factory.interface.ts";
import type { ControllerMethod } from "./guard.interface.ts";
import type { Next } from "./middleware.interface.ts";
import type { Type } from "./type.interface.ts";

export type MethodType = "get" | "post" | "put" | "delete" | "patch";

export interface RouteMap {
  methodPath: string;
  methodType: MethodType;
  fn: ControllerMethod;
  methodName: string;
  instance: InstanceType<Type>;
  cls: Type;
  aliasOptions?: AliasOptions;
}

export type RouteItem = {
  controllerPath: string;
  arr: RouteMap[];
  cls: Type;
  aliasOptions?: AliasOptions;
};

export type MiddlewareHandler = (
  context: Context,
  next: Next,
) => Promise<void>;

export type NotFoundHandler = (context: Context) => Promise<void>;

export abstract class IRouter {
  abstract use(fn: MiddlewareHandler): void;
  abstract get(path: string, fn: MiddlewareHandler): any;
  abstract post(path: string, fn: MiddlewareHandler): any;
  abstract put(path: string, fn: MiddlewareHandler): any;
  abstract delete(path: string, fn: MiddlewareHandler): any;
  abstract patch(path: string, fn: MiddlewareHandler): any;
  abstract startServer(options: ListenOptions): any;
  abstract serveForStatic(staticOptions?: StaticOptions): void;
  abstract routes(): void;
  abstract notFound(fn: NotFoundHandler): void;
  abstract useOriginMiddleware(fn: Function, path?: string): void;
}

export interface IRouterConstructor extends Function {
  new (options?: RouterOptions): IRouter;
}

export interface RouterOptions {
  /** Determines if routes are matched strictly, where the trailing `/` is not
   * optional.  Defaults to `false`. */
  strict?: boolean;

  /** An initial set of keys to be used for signing
   * cookies produced by the application. */
  keys?: string[];
}
