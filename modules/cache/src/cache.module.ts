import { Module, type DynamicModule } from "@nest/core";
import { optionKey } from "./cache.constant.ts";
import { CacheInterceptor } from "./cache.interceptor.ts";
import type { CacheModuleOptions } from "./cache.interface.ts";

@Module({})
export class CacheModule {
  static register(options?: CacheModuleOptions): DynamicModule {
    if (options?.store && options.store !== "LRU") {
      if (options.max !== undefined) {
        console.warn("max option only work with LRU store");
      }
      if (options.maxSize !== undefined) {
        console.warn("maxSize option only work with LRU store");
      }
    }
    return {
      module: CacheModule,
      providers: [
        {
          provide: optionKey,
          useValue: options,
        },
        CacheInterceptor,
      ],
      exports: [CacheInterceptor],
      global: true,
    };
  }
}
