# @nest/cors

Forked from the Node.js package `expressjs cors`. Now it is just a simple and
opinionated cors middleware.

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/cors": "jsr:@nest/cors@^0.0.1"
  }
}
```

Example

```ts
import { NestFactory } from "@nest/core";
import { Router } from "@nest/hono";
import { CORS } from "@nest/cors";

import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);
app.use(CORS());

await app.listen({
  port: 2000,
});
```

If you use the default options, it will work as both `origin: true` and
`credentials: true`.

Test in browser:

```js
fetch("http://localhost:2000", {
  method: "GET",
  mode: "cors",
})
  .then((response) => response.text())
  .then((data) => {
    console.log(data);
  });
```
