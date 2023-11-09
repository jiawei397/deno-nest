import { NestFactory } from "@nest";
import { Router } from "@nest/oak";
import { AppModule } from "./app.module.ts";

const app = await NestFactory.create(AppModule, Router);

const port = Number(Deno.env.get("PORT") || 2000);
app.listen({ port });
