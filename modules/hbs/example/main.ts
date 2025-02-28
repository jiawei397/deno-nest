import { NestFactory } from "@nest/core";
import { Router } from "@nest/hono";
import { AppModule } from "./app.module.ts";
import { setBaseViewsDir } from "@nest/hbs";

const app = await NestFactory.create(AppModule, Router);
setBaseViewsDir("views");
// setBaseViewsDir("views/");

const port = Number(Deno.env.get("PORT") || 2000);
app.listen({
  port,
});
