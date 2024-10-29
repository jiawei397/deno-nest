# @nest/cache

This is a cache module for [`deno_nest`](https://nests.deno.dev/en-US).

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/cache": "jsr:@nest/cache@^0.0.1"
  }
}
```

Then use in `AppModule`:

```typescript
import { Module } from "@nest/core";
import { CacheModule } from "@nest/cache";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    CacheModule.register({
      ttl: 60,
      max: 2,
      isDebug: true,
      // policy: "public",
      // store: "localStorage",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Then `CacheInterceptor` can be used in any Controllers, or in a specific method.

```ts
import { Controller, Get, Params, Query, UseInterceptors } from "@nest/core";
import { CacheInterceptor, CacheTTL, SetCachePolicy } from "@nest/cache";

@Controller("")
@UseInterceptors(CacheInterceptor)
export class AppController {
  @Get("/delay")
  // @UseInterceptors(CacheInterceptor)
  delay(@Query("id") id: string) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("delay " + id);
      }, 1000);
    });
  }
}
```

More can see the example dir.

## TODO

- [x] store
- [x] Deno.kv
