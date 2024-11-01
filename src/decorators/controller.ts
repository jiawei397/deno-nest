import { Reflect } from "../deps.ts";
import type { AliasOptions } from "../interfaces/controller.interface.ts";

export const META_METHOD_KEY = Symbol("meta:method");
export const META_PATH_KEY = Symbol("meta:path");
export const META_ALIAS_KEY = Symbol("meta:alias");
export const META_HTTP_CODE_KEY = Symbol("meta:http:code");
export const META_HEADER_KEY = Symbol("meta:header");
export const SSE_KEY = Symbol("sse");

export const Controller = (
  path: string,
  options?: AliasOptions,
): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(META_PATH_KEY, path, target);
    if (options) {
      Reflect.defineMetadata(META_ALIAS_KEY, options, target);
    }
  };
};

export enum Methods {
  GET = "get",
  POST = "post",
  PUT = "put",
  DELETE = "delete",
  HEAD = "head",
  PATCH = "patch",
  OPTIONS = "options",
}

export type MappingDecoratorResult = (
  path: string,
  options?: AliasOptions,
) => MethodDecorator;

function createMappingDecorator(method: Methods): MappingDecoratorResult {
  return (path, options) => (_target, _property, descriptor) => {
    Reflect.defineMetadata(META_PATH_KEY, path, descriptor.value);
    Reflect.defineMetadata(META_METHOD_KEY, method, descriptor.value);
    if (!options) {
      return;
    }
    Reflect.defineMetadata(META_ALIAS_KEY, options, descriptor.value);
  };
}

export const Get: MappingDecoratorResult = createMappingDecorator(Methods.GET);
export const Post: MappingDecoratorResult = createMappingDecorator(
  Methods.POST,
);
export const Delete: MappingDecoratorResult = createMappingDecorator(
  Methods.DELETE,
);
export const Put: MappingDecoratorResult = createMappingDecorator(Methods.PUT);
export const Head: MappingDecoratorResult = createMappingDecorator(
  Methods.HEAD,
);
export const Options: MappingDecoratorResult = createMappingDecorator(
  Methods.OPTIONS,
);
export const Patch: MappingDecoratorResult = createMappingDecorator(
  Methods.PATCH,
);

export function HttpCode(code: number): MethodDecorator {
  return (_target, _property, descriptor) => {
    Reflect.defineMetadata(META_HTTP_CODE_KEY, code, descriptor.value);
  };
}

function addHeader(
  key: string,
  val: string,
  // deno-lint-ignore no-explicit-any
  descriptor: TypedPropertyDescriptor<any>,
) {
  const map = Reflect.getMetadata(META_HEADER_KEY, descriptor.value) || {};
  map[key] = val;
  Reflect.defineMetadata(META_HEADER_KEY, map, descriptor.value);
}

export function Header(key: string, val: string): MethodDecorator {
  return (_target, _property, descriptor) => {
    addHeader(key, val, descriptor);
  };
}

export function Redirect(location: string, status = 302): MethodDecorator {
  return (_target, _property, descriptor) => {
    addHeader("Location", location, descriptor);
    // set status
    Reflect.defineMetadata(META_HTTP_CODE_KEY, status, descriptor.value);
  };
}

export function Sse(): MethodDecorator {
  return (_target, _property, descriptor) => {
    addHeader("Content-Type", "text/event-stream", descriptor);
    addHeader("Connection", "keep-alive", descriptor);
    addHeader("Cache-Control", "no-cache", descriptor);
  };
}
