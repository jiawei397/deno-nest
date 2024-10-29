# @nest/oak

This is a [oak](https://github.com/oakserver/oak) module for [`deno_nest`](https://nests.deno.dev/en-US).

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/oak": "jsr:@nest/oak@^0.0.1",
  }
}
```

app.module.ts:

```typescript
import { NestFactory } from "@nest/core";
import { Router } from "@nest/oak";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
app.setGlobalPrefix("/api");
app.useStaticAssets("example/static", {
  prefix: "static",
});

const port = Number(Deno.env.get("PORT") || 2000);
await app.listen({
  port,
});
```

More can see the example dir.
