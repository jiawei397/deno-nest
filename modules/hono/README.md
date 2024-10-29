# @nest/hono

This is a [Hono](https://hono.dev/) module for [`deno_nest`](https://nests.deno.dev/en-US).
The default `Hono` version is `4.6.6`

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1"
  }
}
```

app.module.ts:

```typescript
import { NestFactory } from "@nest/core";
import { Router } from "@nest/hono";
import { etag } from "hono/middleware.ts";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
app.useOriginMiddleware(etag({
  weak: true,
}));

const port = Number(Deno.env.get("PORT") || 2000);
await app.listen({
  port,
});
```

More can see the example dir.
