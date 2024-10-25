import { NestFactory } from "@nest/core";
import { HonoRouter } from "@nest/hono";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, HonoRouter);

const port = Number(Deno.env.get("PORT") || 2000);
app.listen({ port });
