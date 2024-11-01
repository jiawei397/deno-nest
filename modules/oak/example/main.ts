import { NestFactory } from "@nest/core";
import { Router } from "@nest/oak";
import { AppModule } from "./app.module.ts";
import { CORS } from "https://deno.land/x/oak_cors@v0.1.1/mod.ts";

const app = await NestFactory.create(AppModule, Router);
app.setGlobalPrefix("/api");
app.useStaticAssets("example/static", {
  prefix: "static",
});
app.enableShutdownHooks(["SIGINT"]);

app.useOriginMiddleware(CORS());

app.use(async (req, res, next) => {
  const start = Date.now();
  console.log(`${req.method} ${req.url}`);
  await next();
  const ms = Date.now() - start;
  console.log(`${req.method} ${req.url} ${res.status} - ${ms}ms`);
});

app.get("/", (_req, res) => {
  res.body = "Hello World!";
});

const port = Number(Deno.env.get("PORT") || 2000);
app.listen({ port });
