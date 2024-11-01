import { NestFactory } from "@nest/core";
import { Router } from "@nest/hono";
import { AppModule } from "./app.module.ts";
import { HttpExceptionFilter } from "./exception.ts";
import { etag } from "../deps.ts";

const app = await NestFactory.create(AppModule, Router, { strict: false });
app.setGlobalPrefix("/api");
app.useStaticAssets("example/static", {
  prefix: "static",
});
app.useGlobalFilters(HttpExceptionFilter);
app.enableShutdownHooks(["SIGINT"]);

app.useOriginMiddleware(etag({
  weak: true,
}));

app.use(async (req, res, next) => {
  const start = Date.now();
  console.log(`${req.method} ${req.url}`);
  await next();
  const ms = Date.now() - start;
  console.log(`${req.method} ${req.url} ${res.status} - ${ms}ms`);
});

const port = Number(Deno.env.get("PORT") || 2000);
await app.listen({
  port,
});

// setTimeout(() => {
//   app.close();
//   console.log("server closed");
// }, 1000);
