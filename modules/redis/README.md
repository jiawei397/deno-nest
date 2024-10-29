# @nest/redis

This is a redis module for [`deno_nest`](https://nests.deno.dev/en-US).
The default redis client is `npm:@redis/client@^1`.

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/redis": "jsr:@nest/redis@^0.0.2",
  }
}
```

app.module.ts:

```typescript
import { Module } from "@nest/core";
import { createStore, RedisModule } from "@nest/redis";
import { CacheModule } from "@nest/cache";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    RedisModule.forRoot({
      port: 6379,
      hostname: "192.168.21.176",
      password: "123456",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Then can be used in AppController:

```ts
import { Controller, Get, Inject, UseInterceptors } from "@nest/core";
import { CacheInterceptor, SetCacheStore } from "@nest/cache";
import { type Redis, REDIS_KEY, RedisService } from "@nest/redis";

@Controller("")
export class AppController {
  constructor(private readonly redisService: RedisService) {}
  @Get("/")
  version() {
    this.redisService.set("version", "1.0.0");
    return this.redisService.get("version");
  }
}
```

More can see the example dir.
