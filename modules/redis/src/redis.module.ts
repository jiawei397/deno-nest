import { type DynamicModule, Module, red, yellow } from "@nest/core";
import { REDIS_KEY } from "./redis.constant.ts";
import { RedisService } from "./redis.service.ts";
import { RedisStore } from "./redis.store.ts";
import { createClient, type RedisClientOptions } from "redis";
import type { Redis } from "../deps.ts";

@Module({})
export class RedisModule {
  static client: Redis;

  static forRoot(db: RedisClientOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS_KEY,
          useFactory: async () => { // can be async
            try {
              const client = await createClient(db)
                .on("error", (err) => console.log("Redis Client", err))
                .connect();
              console.info("connect to redis success");
              this.client = client;
              return client;
            } catch (e) {
              console.error(
                "connect to redis error",
                red((e as Error).stack || e as string),
              );
            }
          },
        },
        RedisService,
        RedisStore,
      ],
      exports: [REDIS_KEY, RedisService, RedisStore],
      global: true,
    };
  }

  static getClient(): Redis {
    return this.client;
  }
}
