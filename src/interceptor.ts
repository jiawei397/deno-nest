// deno-lint-ignore-file no-explicit-any
import { Reflect } from "./deps.ts";
import { factory } from "./factorys/class.factory.ts";
import type { Context } from "./interfaces/context.interface.ts";
import type { ControllerMethod } from "./interfaces/guard.interface.ts";
import type {
  NestInterceptor,
  NestInterceptorOptions,
  NestUseInterceptors,
} from "./interfaces/interceptor.interface.ts";
import type { Next } from "./interfaces/middleware.interface.ts";
import type { Constructor } from "./interfaces/type.interface.ts";
export const META_INTERCEPTOR_KEY = Symbol("meta:interceptor");

export function UseInterceptors(
  ...interceptors: NestUseInterceptors
): (
  target: any,
  property?: string | symbol,
  descriptor?: TypedPropertyDescriptor<any>,
) => void {
  return function (
    target,
    _property,
    descriptor,
  ) {
    Reflect.defineMetadata(
      META_INTERCEPTOR_KEY,
      interceptors,
      descriptor ? descriptor.value : target.prototype,
    );
  };
}

export function getInterceptors(
  target: InstanceType<Constructor>,
  fn: ControllerMethod,
  globalInterceptors: NestUseInterceptors,
): Promise<NestInterceptor[]> {
  return factory.getMergedMetas<NestInterceptor>(
    target,
    fn,
    globalInterceptors,
    META_INTERCEPTOR_KEY,
  );
}

export async function checkByInterceptors(
  context: Context,
  globalInterceptors: NestUseInterceptors,
  fn: ControllerMethod,
  options: NestInterceptorOptions,
): Promise<void> {
  const { target, next } = options;
  const interceptors = await getInterceptors(target, fn, globalInterceptors);
  if (interceptors.length > 0) {
    return compose(interceptors)(context, next, options);
  } else {
    return next();
  }
}

/** Compose multiple interceptors functions into a single interceptor function. */
export function compose(
  interceptors: NestInterceptor[],
): (
  context: Context,
  next?: Next,
  options?: NestInterceptorOptions,
) => Promise<void> {
  return function composedInterceptors(context, next, options) {
    let index = -1;

    async function dispatch(i: number): Promise<void> {
      if (i <= index) {
        throw new Error("next() called multiple times.");
      }
      index = i;
      const interceptor = interceptors[i];
      if (!interceptor) {
        if (next && i === interceptors.length) {
          return next();
        }
        return;
      }
      return await interceptor.intercept(
        context,
        dispatch.bind(null, i + 1),
        options,
      );
    }

    return dispatch(0);
  };
}
