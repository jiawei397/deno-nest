// deno-lint-ignore-file no-explicit-any
import {
  Context,
  Inject,
  Injectable,
  NestInterceptor,
  NestInterceptorOptions,
  Next,
  Reflect,
} from "../../../mod.ts";
import { isDebug } from "../../../src/utils.ts";
import {
  META_CACHE_KEY_KEY,
  META_CACHE_POLICY_KEY,
  META_CACHE_TTL_KEY,
  optionKey,
} from "./cache.constant.ts";
import {
  CacheModuleOptions,
  CachePolicy,
  CacheStore,
} from "./cache.interface.ts";
import { LocalStore, MemoryStore } from "./cache.store.ts";

export function CacheTTL(seconds: number) {
  return (_target: any, _methodName: string, descriptor: any) => {
    Reflect.defineMetadata(META_CACHE_TTL_KEY, seconds, descriptor.value);
  };
}

export function CacheKey(key: string) {
  return (_target: any, _methodName: string, descriptor: any) => {
    Reflect.defineMetadata(META_CACHE_KEY_KEY, key, descriptor.value);
  };
}

export function SetCachePolicy(policy: CachePolicy) {
  return (_target: any, _methodName: string, descriptor: any) => {
    Reflect.defineMetadata(META_CACHE_POLICY_KEY, policy, descriptor.value);
  };
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  ttl: number;
  max: number;
  policy: CachePolicy;
  caches: CacheStore | undefined;
  memoryCache: MemoryStore;
  constructor(
    @Inject(optionKey) private cacheModuleOptions?: CacheModuleOptions,
  ) {
    this.ttl = cacheModuleOptions?.ttl || 5;
    this.max = cacheModuleOptions?.max || 100;
    this.policy = cacheModuleOptions?.policy || "no-cache";
    this.memoryCache = new MemoryStore();
    this.init(cacheModuleOptions);
  }

  async init(cacheModuleOptions?: CacheModuleOptions) {
    if (!cacheModuleOptions?.store || cacheModuleOptions.store === "memory") {
      // this.caches = new MemoryStore();
    } else if (cacheModuleOptions.store === "localStorage") {
      this.caches = new LocalStore();
    } else {
      this.caches = typeof cacheModuleOptions.store === "function"
        ? await cacheModuleOptions.store()
        : cacheModuleOptions.store;
    }
  }

  joinArgs(args: any[]) {
    let result = "";
    args.forEach((arg) => {
      if (typeof arg === "object") {
        result += JSON.stringify(arg);
      } else {
        if (arg) {
          result += arg;
        }
      }
    });
    return result;
  }
  async intercept(
    context: Context,
    next: Next,
    options: NestInterceptorOptions,
  ) {
    if (context.request.method !== "GET") { // only deal get request
      return next();
    }
    const size = await (this.caches || this.memoryCache).size();
    if (size >= this.max) {
      console.warn("cache size has reached the max", size);
      return next();
    }
    const constructorName = options.target.constructor.name;

    const key = Reflect.getOwnMetadata(
      META_CACHE_KEY_KEY,
      options.target[options.methodName],
    ) ||
      (this.cacheModuleOptions?.getCacheKey
        ? this.cacheModuleOptions.getCacheKey({
          constructorName,
          methodName: options.methodName,
          methodType: options.methodType,
          args: options.args,
        })
        : [
          constructorName,
          options.methodName,
          options.methodType,
          this.joinArgs(options.args),
        ].join("_"));
    const cacheValue = this.memoryCache.get(key) || await this.caches?.get(key);
    const policy = Reflect.getOwnMetadata(
      META_CACHE_POLICY_KEY,
      options.target[options.methodName],
    ) || this.policy;

    if (cacheValue !== undefined) {
      if (isDebug()) {
        console.debug("cache hit", key, cacheValue);
      }
      return cacheValue;
    }
    const result = next();
    const ttl: number = Reflect.getOwnMetadata(
      META_CACHE_TTL_KEY,
      options.target[options.methodName],
    ) || this.ttl;
    let isCached = false;
    let lastResult: any = context.response.body ?? result;
    if (result && (result instanceof Promise || !this.caches)) {
      if (result instanceof Promise) {
        lastResult = result.then((val) => context.response.body ?? val);
      }
      this.memoryCache.set(key, lastResult, { ttl });
    } else {
      this.caches?.set(key, lastResult, { ttl });
      isCached = true;
    }
    try {
      const val = await lastResult;
      if (!isCached && this.caches) {
        await this.caches.set(key, val, { ttl });
        this.memoryCache.delete(key);
      }
      if (this.cacheModuleOptions?.isCacheableValue) {
        if (!this.cacheModuleOptions.isCacheableValue(val)) {
          this.memoryCache.delete(key);
          this.caches?.delete(key);
          return val;
        }
      }
      if (policy === "public" || policy === "private") {
        context.response.headers.set(
          "Cache-Control",
          policy === "public" ? `max-age=${ttl}` : `${policy}, max-age=${ttl}`,
        );
      }
      return val;
    } catch (error) {
      this.memoryCache.delete(key);
      this.caches?.delete(key);
      throw error;
    }
  }
}
