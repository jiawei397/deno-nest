// deno-lint-ignore-file no-explicit-any
import { Reflect } from "./deps.ts";
import { factory } from "./factorys/class.factory.ts";
import type {
  CanActivate,
  Constructor,
  Context,
  ControllerMethod,
  NestGuards,
} from "./interfaces/mod.ts";

export const META_FUNCTION_KEY = Symbol("meta:fn");
export const META_GUARD_KEY = Symbol("meta:guard");

export function UseGuards(
  ...guards: NestGuards
): (
  target: any,
  property?: string,
  descriptor?: TypedPropertyDescriptor<any>,
) => void {
  return function (target, property, descriptor) {
    Reflect.defineMetadata(
      META_GUARD_KEY,
      guards,
      property ? descriptor!.value : target.prototype,
    );
  };
}

export function getAllGuards(
  target: InstanceType<Constructor>,
  fn: ControllerMethod,
  globalGuards: NestGuards,
): Promise<CanActivate[]> {
  return factory.getMergedMetas<CanActivate>(
    target,
    fn,
    globalGuards,
    META_GUARD_KEY,
  );
}

export async function checkByGuard(
  target: InstanceType<Constructor>,
  fn: ControllerMethod,
  context: Context,
  globalGuards: NestGuards,
): Promise<boolean> {
  const guards = await getAllGuards(target, fn, globalGuards);
  if (guards.length > 0) {
    Reflect.defineMetadata(META_FUNCTION_KEY, fn, context); // record the function to context
    for (let i = 0; i < guards.length; i++) {
      const guard = guards[i];
      const result = await guard.canActivate(context);
      if (!result) {
        return false; // will not continue to next guard and not throw an exception
      }
    }
  }
  return true;
}

/**
 * Decorator that assigns metadata to the class/function using the
 * specified `key`.
 *
 * Requires two parameters:
 * - `key` - a value defining the key under which the metadata is stored
 * - `value` - metadata to be associated with `key`
 *
 * This metadata can be reflected using the `Reflector` class.
 *
 * Example: `@SetMetadata('roles', ['admin'])`
 */
export function SetMetadata<K = string, V = any>(
  metadataKey: K,
  metadataValue: V,
): (
  target: any,
  propertyKey?: string | symbol,
  descriptor?: PropertyDescriptor,
) => void {
  return (
    target,
    propertyKey,
    descriptor,
  ) => {
    if (propertyKey) {
      Reflect.defineMetadata(metadataKey, metadataValue, descriptor!.value);
    } else {
      Reflect.defineMetadata(metadataKey, metadataValue, target);
    }
  };
}

export function GetMetadata<T = any>(
  metadataKey: string,
  target: any,
): T | undefined {
  return Reflect.getOwnMetadata(metadataKey, target);
}

export function getMetadataForGuard<T = any>(
  metadataKey: string,
  context: Context,
): T | undefined {
  const fn = Reflect.getOwnMetadata(META_FUNCTION_KEY, context);
  if (fn) {
    return Reflect.getOwnMetadata(metadataKey, fn);
  }
}

export class Reflector {
  /**
   * Retrieve metadata for a specified key for a specified target.
   *
   * @example
   * `const roles = this.reflector.get<string[]>('roles', context);`
   *
   * @param metadataKey lookup key for metadata to retrieve
   * @param context context (decorated object) to retrieve metadata from
   */
  get<T>(metadataKey: string, context: Context): T | undefined {
    return getMetadataForGuard<T>(metadataKey, context);
  }
}
