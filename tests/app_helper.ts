// deno-lint-ignore-file no-explicit-any no-unused-vars
import {
  Body,
  Catch,
  type Context,
  Controller,
  Delete,
  ExceptionFilter,
  Form,
  Get,
  Injectable,
  IRouterConstructor,
  ModuleType,
  NestFactory,
  NestInterceptor,
  Next,
  Patch,
  Post,
  Put,
} from "@nest";
import { Module } from "@nest";
import { Max, Min } from "class_validator";
import { findUnusedPort } from "./common_helper.ts";
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertNotStrictEquals,
  delay,
  it,
} from "../test_deps.ts";

let firstPort = 8000;

async function getPort() {
  const port = await findUnusedPort(firstPort);
  firstPort++;
  return port;
}

export function createCommonTests(
  Router: IRouterConstructor,
  type: "oak" | "hono",
) {
  let firstPort = 8000;
  async function createApp(module: ModuleType, apiPrefix?: string) {
    const app = await NestFactory.create(module, Router);
    const port = await getPort();
    firstPort++;
    if (apiPrefix) {
      app.setGlobalPrefix(apiPrefix);
    }
    app.listen({ port });
    await delay(100);
    const baseUrl = `http://localhost:${port}`;
    return { app, port, baseUrl };
  }

  Deno.test(
    `${type} fetch 404`,
    { sanitizeOps: false, sanitizeResources: false },
    async (t) => {
      @Module({})
      class AppModule {}
      const { app, baseUrl } = await createApp(AppModule);

      await t.step("fetch 404", async () => {
        const res = await fetch(baseUrl);
        assertEquals(res.status, 404);
        await res.body?.cancel();
      });
      await app.close();
    },
  );

  Deno.test(
    `${type} fetch success`,
    { sanitizeOps: false, sanitizeResources: false },
    async (t) => {
      await t.step("global prefix not work with app.get", async (it) => {
        const callStack: number[] = [];
        @Module({})
        class AppModule {}

        const { app, baseUrl } = await createApp(AppModule, "/api");

        app.get("/", (_, res) => {
          callStack.push(1);
          res.body = "hello world";
        });

        await it.step("fetch /", async () => {
          const res = await fetch(`${baseUrl}`);
          assertEquals(res.status, 200);
          assertEquals(await res.text(), "hello world");
          assertEquals(callStack, [1]);
          callStack.length = 0;
        });

        await it.step("fetch /api", async () => {
          const res = await fetch(`${baseUrl}/api`);
          assertEquals(res.status, 404);
          res.body?.cancel();
          assertEquals(callStack, []);
        });

        await app.close();
      });

      await t.step("fetch ok with global prefix, return result", async (it) => {
        @Controller("/")
        class A {
          @Get("/")
          get() {
            return "hello world";
          }
        }

        @Module({
          controllers: [A],
        })
        class AppModule {}

        const { app, baseUrl } = await createApp(AppModule, "/api");

        const res = await fetch(`${baseUrl}/api`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");

        await app.close();
      });

      await t.step(
        "fetch ok with global prefix, change with body",
        async () => {
          @Controller("/")
          class A {
            @Get("/")
            b(context: Context) {
              context.response.body = "b";
            }
          }

          @Module({
            controllers: [A],
          })
          class AppModule {}

          const { app, baseUrl } = await createApp(AppModule, "/api");

          const res = await fetch(`${baseUrl}/api`);
          assertEquals(res.status, 200);
          assertEquals(await res.text(), "b");
          await app.close();
        },
      );

      await t.step("fetch error", async () => {
        @Controller("/")
        class A {
          @Get("/")
          error() {
            throw new Error("error");
          }
        }

        @Module({
          controllers: [A],
        })
        class AppModule {}

        const { app, baseUrl } = await createApp(AppModule, "/api");

        const res = await fetch(`${baseUrl}/api`);
        assertEquals(res.status, 500);
        assertEquals(await res.json(), {
          "statusCode": 500,
          "message": "error",
          "error": "Internal Server Error",
        });

        await app.close();
      });
    },
  );

  Deno.test(`${type} test strict`, {
    sanitizeOps: false,
    sanitizeResources: false,
  }, async (t) => {
    await t.step("set strict true", async (it) => {
      const callStack: number[] = [];
      @Module({})
      class AppModule {}

      const app = await NestFactory.create(AppModule, Router, { strict: true });

      app.get("/", (_, res) => {
        callStack.push(1);
        res.body = "hello world";
      });

      app.get("/api", (_, res) => {
        callStack.push(2);
        res.body = "api";
      });

      const port = await getPort();
      app.listen({ port });
      await delay(100);

      await it.step("fetch /", async () => {
        const res = await fetch(`http://localhost:${port}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await it.step("fetch /api", async () => {
        const res = await fetch(`http://localhost:${port}/api`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "api");
        assertEquals(callStack, [2]);
        callStack.length = 0;
      });

      await it.step("fetch /api/", async () => {
        const res = await fetch(`http://localhost:${port}/api/`);
        assertEquals(res.status, 404);
        await res.body?.cancel();
        assertEquals(callStack, []);
      });

      await app.close();
    });

    await t.step("set strict false", async (it) => {
      const callStack: number[] = [];
      @Module({})
      class AppModule {}

      const app = await NestFactory.create(AppModule, Router, {
        strict: false,
      });

      app.get("/", (_, res) => {
        callStack.push(1);
        res.body = "hello world";
      });

      app.get("/api", (_, res) => {
        callStack.push(2);
        res.body = "api";
      });

      const port = await getPort();
      app.listen({ port });
      await delay(100);

      await it.step("fetch /", async () => {
        const res = await fetch(`http://localhost:${port}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await it.step("fetch /api", async () => {
        const res = await fetch(`http://localhost:${port}/api`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "api");
        assertEquals(callStack, [2]);
        callStack.length = 0;
      });

      await it.step("fetch /api/", async () => {
        const res = await fetch(`http://localhost:${port}/api/`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "api");
        assertEquals(callStack, [2]);
        callStack.length = 0;
      });

      await app.close();
    });
  });

  Deno.test(
    `${type} method tests`,
    { sanitizeOps: false, sanitizeResources: false },
    async (t) => {
      const callStack: number[] = [];
      const data = { a: 1 };

      @Controller("/")
      class A {
        @Post("/")
        post(@Body() body: any) {
          callStack.push(1);
          assertEquals(body, data);
          return "hello world";
        }

        @Put("/")
        put(@Body() body: any) {
          callStack.push(2);
          assertEquals(body, data);
          return "hello world";
        }

        @Delete("/")
        del() {
          callStack.push(3);
          return "hello world";
        }

        @Patch("/")
        patch() {
          callStack.push(4);
          return "hello world";
        }
      }

      @Module({
        controllers: [A],
      })
      class AppModule {}

      const { app, baseUrl } = await createApp(AppModule);

      await t.step("post", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        });
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await t.step("put", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "PUT",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        });
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [2]);
        callStack.length = 0;
      });

      await t.step("delete", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "DELETE",
        });
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [3]);
        callStack.length = 0;
      });

      await t.step("patch", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "PATCH",
        });
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [4]);
        callStack.length = 0;
      });

      // last
      await app.close();
    },
  );

  Deno.test(
    `${type} body validate`,
    { sanitizeOps: false, sanitizeResources: false },
    async (t) => {
      const callStack: number[] = [];
      const data = { a: 1 };

      class Dto {
        @Max(5)
        @Min(1)
        a: number;
      }

      @Controller("/")
      class A {
        @Post("/")
        post(@Body() body: Dto) {
          callStack.push(1);
          assertEquals(body, data);
          return "hello world";
        }
      }

      @Module({
        controllers: [A],
      })
      class AppModule {}

      const { app, baseUrl } = await createApp(AppModule);

      await t.step("success", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        });
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await t.step("invalid", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "POST",
          body: JSON.stringify({ a: 20 }),
          headers: {
            "Content-Type": "application/json",
          },
        });
        assertEquals(res.status, 400);
        res.body?.cancel();
        assertEquals(callStack, []);
      });

      await t.step("invalid 2", async () => {
        const res = await fetch(`${baseUrl}/`, {
          method: "POST",
          body: JSON.stringify({}),
          headers: {
            "Content-Type": "application/json",
          },
        });
        assertEquals(res.status, 400);
        res.body?.cancel();
        assertEquals(callStack, []);
      });

      // last
      await app.close();
    },
  );

  Deno.test(`${type} use middleware`, {
    sanitizeOps: false,
    sanitizeResources: false,
  }, async (t) => {
    @Module({})
    class AppModule {}

    await t.step("middleware with 404", async () => {
      const app = await NestFactory.create(AppModule, Router);
      const callStack: number[] = [];
      app.use(async (req, res, next) => {
        callStack.push(1);
        await next();
        callStack.push(2);
        assertEquals(res.status, 404);
      });

      const port = await getPort();
      app.listen({ port });
      await delay(100);

      const res = await fetch(`http://localhost:${port}`);
      assertEquals(res.status, 404);
      res.body?.cancel();
      assertEquals(callStack, [1, 2]);
      callStack.length = 0;
      await app.close();
    });

    await t.step("middleware with app.get", async (it) => {
      const app = await NestFactory.create(AppModule, Router);
      const callStack: number[] = [];

      app.get("/", (_, res) => {
        callStack.push(3);
        return "hello world";
      });

      app.get("/hello", (_, res) => {
        callStack.push(4);
        res.body = "hello world";
      });

      app.use(async (req, res, next) => {
        callStack.push(1);
        await next();
        callStack.push(2);
      });

      const port = await getPort();
      app.listen({ port });
      await delay(100);

      await it.step("fetch /", async () => {
        const res = await fetch(`http://localhost:${port}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        // TODO: this example shows the order of get middleware is not correct in oak, because it used app.use instead of router.use, if use router.use, the order will be correct, but it will not be able to handle 404
        if (type === "hono") {
          assertEquals(callStack, [3]);
        } else if (type === "oak") {
          assertEquals(callStack, [1, 3, 2]);
        }

        callStack.length = 0;
      });

      await it.step("fetch /hello", async () => {
        const res = await fetch(`http://localhost:${port}/hello`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        if (type === "hono") {
          assertEquals(callStack, [4]);
        } else if (type === "oak") {
          assertEquals(callStack, [1, 4, 2]);
        }
      });

      // last
      callStack.length = 0;
      await app.close();
    });

    await t.step("middleware with controller error", async () => {
      @Controller("/")
      class A {
        @Get("/")
        get() {
          throw new Error("error");
        }
      }

      @Module({
        controllers: [A],
      })
      class AppModule {}

      const app = await NestFactory.create(AppModule, Router);
      const callStack: number[] = [];

      app.use(async (req, res, next) => {
        callStack.push(1);
        await next();
        callStack.push(2);
      });
      const port = await getPort();
      app.listen({ port });

      // test start
      addEventListener("error", (event) => {
        event.preventDefault();
        callStack.push(3);
      });

      addEventListener("unhandledrejection", (event) => {
        event.preventDefault();
        callStack.push(4);
      });

      const res = await fetch(`http://localhost:${port}`);
      assertEquals(res.status, 500);
      assertEquals(await res.json(), {
        "statusCode": 500,
        "message": "error",
        "error": "Internal Server Error",
      });
      assertEquals(callStack, [1, 2]);

      // last
      callStack.length = 0;
      await app.close();
    });
  });

  Deno.test(`${type} use middleware and interceptor`, {
    sanitizeOps: false,
    sanitizeResources: false,
  }, async (t) => {
    @Module({})
    class AppModule {}

    await t.step(
      "middleware work, but interceptor not work when 404",
      async () => {
        const callStack: number[] = [];
        const app = await NestFactory.create(AppModule, Router);

        @Injectable()
        class GlobalInterceptor implements NestInterceptor {
          async intercept(_ctx: Context, next: Next) {
            callStack.push(1);
            await next();
            callStack.push(2);
          }
        }

        app.use(async (req, res, next) => {
          callStack.push(3);
          await next();
          callStack.push(4);
          assertEquals(res.status, 404);
        });

        app.useGlobalInterceptors(GlobalInterceptor);

        const port = await getPort();
        app.listen({ port });
        await delay(100);

        const res = await fetch(`http://localhost:${port}`);
        assertEquals(res.status, 404);
        res.body?.cancel();
        assertEquals(callStack, [3, 4]);
        callStack.length = 0;
        await app.close();
      },
    );

    await t.step(
      "interceptor not work when use app.get",
      async () => {
        const callStack: number[] = [];
        const app = await NestFactory.create(AppModule, Router);

        app.get("/", () => {
          callStack.push(3);
          return "hello world";
        });

        @Injectable()
        class GlobalInterceptor implements NestInterceptor {
          async intercept(_ctx: Context, next: Next) {
            callStack.push(1);
            await next();
            callStack.push(2);
          }
        }

        app.useGlobalInterceptors(GlobalInterceptor);

        const port = await getPort();
        app.listen({ port });
        await delay(100);

        const res = await fetch(`http://localhost:${port}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [3]);
        callStack.length = 0;
        await app.close();
      },
    );

    await t.step(
      "interceptor work with controller",
      async () => {
        const callStack: number[] = [];

        @Controller("")
        class A {
          @Get("/")
          get() {
            callStack.push(5);
            return "hello world";
          }
        }

        @Module({
          controllers: [A],
        })
        class AppModule {}

        const app = await NestFactory.create(AppModule, Router);

        @Injectable()
        class GlobalInterceptor implements NestInterceptor {
          async intercept(_ctx: Context, next: Next) {
            callStack.push(1);
            await next();
            callStack.push(2);
          }
        }

        app.use(async (req, res, next) => {
          callStack.push(3);
          await next();
          callStack.push(4);
          assertEquals(res.status, 200);
        });

        app.useGlobalInterceptors(GlobalInterceptor);

        const port = await getPort();
        app.listen({ port });
        await delay(100);

        const res = await fetch(`http://localhost:${port}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assertEquals(callStack, [3, 1, 5, 2, 4]);
        callStack.length = 0;
        await app.close();
      },
    );
  });

  Deno.test(`${type} use middleware and filter`, {
    sanitizeOps: false,
    sanitizeResources: false,
  }, async (t) => {
    const callStack: number[] = [];

    await t.step("filter works", async () => {
      @Controller("")
      class A {
        @Get("/")
        get() {
          callStack.push(1);
          throw new Error("error");
        }
      }

      @Module({
        controllers: [A],
      })
      class AppModule {}
      const app = await NestFactory.create(AppModule, Router);

      app.use(async (req, res, next) => {
        callStack.push(2);
        await next();
        callStack.push(3);
      });

      @Catch()
      class GlobalFilter implements ExceptionFilter {
        // deno-lint-ignore require-await
        async catch(exception: any, context: Context): Promise<void> {
          callStack.push(4);
          context.response.body = "catched";
        }
      }

      app.useGlobalFilters(GlobalFilter);

      const port = await getPort();
      app.listen({ port });
      await delay(100);

      const res = await fetch(`http://localhost:${port}`);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "catched");
      assertEquals(callStack, [2, 1, 4, 3]);

      callStack.length = 0;
      await app.close();
    });

    await t.step("filter not works when use app.get", async () => {
      @Module({})
      class AppModule {}
      const app = await NestFactory.create(AppModule, Router);

      app.get("/", () => {
        callStack.push(1);
        throw new Error("error");
      });
      app.use(async (req, res, next) => {
        callStack.push(2);
        await next();
        callStack.push(3);
      });

      @Catch()
      class GlobalFilter implements ExceptionFilter {
        // deno-lint-ignore require-await
        async catch(exception: any, context: Context): Promise<void> {
          callStack.push(4);
          context.response.body = "catched";
        }
      }

      app.useGlobalFilters(GlobalFilter);

      const port = await getPort();
      app.listen({ port });
      await delay(100);

      const res = await fetch(`http://localhost:${port}`);
      assertEquals(res.status, 500);
      assertEquals(await res.text(), "Internal Server Error");

      if (type === "hono") { // if change app.get and app.use order, the result will be different
        assertEquals(callStack, [1]);
      } else if (type === "oak") {
        assertEquals(callStack, [2, 1]);
      }
      callStack.length = 0;
      await app.close();
    });
  });

  Deno.test("multi types body", {
    sanitizeOps: false,
    sanitizeResources: false,
  }, async (t) => {
    await t.step("text", async (it) => {
      const callStack: number[] = [];
      @Module({})
      class AppModule {}

      const { app, baseUrl } = await createApp(AppModule);

      app.get("/", (_, res) => {
        callStack.push(1);
        res.body = "hello world";
        res.headers.set("Content-Type", "text/plain");
        res.headers.set("a", "b");
      });

      await it.step("fetch /", async () => {
        const res = await fetch(`${baseUrl}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "hello world");
        assert(res.headers.get("Content-Type")?.includes("text/plain"));
        assertEquals(res.headers.get("a"), "b");

        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await app.close();
    });

    await t.step("json", async (it) => {
      const callStack: number[] = [];
      @Module({})
      class AppModule {}

      const { app, baseUrl } = await createApp(AppModule);

      app.get("/", (_, res) => {
        callStack.push(1);
        res.body = { a: 1 };
        res.headers.set("Content-Type", "application/json");
      });

      await it.step("fetch /", async () => {
        const res = await fetch(`${baseUrl}`);
        assertEquals(res.status, 200);
        assertEquals(await res.json(), { a: 1 });
        assert(res.headers.get("Content-Type")?.includes("application/json"));

        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await app.close();
    });

    await t.step("json with object", async (it) => {
      const callStack: number[] = [];
      @Module({})
      class AppModule {}

      const { app, baseUrl } = await createApp(AppModule);

      app.get("/", (_, res) => {
        callStack.push(1);
        res.body = { a: 1 };
      });

      await it.step("fetch /", async () => {
        const res = await fetch(`${baseUrl}`);
        assertEquals(res.status, 200);
        assertEquals(await res.json(), { a: 1 });
        assert(res.headers.get("Content-Type")?.includes("application/json"));

        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await app.close();
    });

    await t.step("html is left", async (it) => {
      const callStack: number[] = [];
      @Module({})
      class AppModule {}

      const { app, baseUrl } = await createApp(AppModule);

      app.get("/", (_, res) => {
        callStack.push(1);
        res.body = 123;
      });

      await it.step("num maybe text/html or text/plain, it not important, so not to fix this", async () => {
        const res = await fetch(`${baseUrl}`);
        assertEquals(res.status, 200);
        assertEquals(await res.text(), "123");
        assert(
          res.headers.get("Content-Type")?.includes("text/html") || // in hono
            res.headers.get("Content-Type")?.includes("text/plain"), // in oak
        );

        assertEquals(callStack, [1]);
        callStack.length = 0;
      });

      await app.close();
    });
  });

  Deno.test(`${type} request methods`, {
    sanitizeOps: false,
    sanitizeResources: false,
  }, async (t) => {
    @Module({})
    class AppModule {}

    await t.step("method and url", async () => {
      const callStack: number[] = [];
      const { app, baseUrl } = await createApp(AppModule);
      const baseURL = new URL(baseUrl);

      app.get("/", async (req, res) => {
        callStack.push(1);
        assertEquals(req.method, "GET");
        const url = new URL(req.url);
        assertEquals(url.pathname, baseURL.pathname);
        assert(await req.text() === "");
        res.body = "hello world";
        assertEquals(res.statusText, "OK");
        const originResponse = res.getOriginalResponse();
        assertNotEquals(originResponse, res);
      });

      const res = await fetch(`${baseUrl}`);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "hello world");

      assertEquals(callStack, [1]);
      callStack.length = 0;

      await app.close();
    });

    await t.step("query", async () => {
      const callStack: number[] = [];
      const { app, baseUrl } = await createApp(AppModule);
      const baseURL = new URL(baseUrl);

      app.get("/", async (req, res) => {
        callStack.push(1);
        assertEquals(req.method, "GET");
        const url = new URL(req.url);
        assertEquals(url.pathname, baseURL.pathname);
        assertEquals(req.queries("a"), ["1", "2"]);
        assertEquals(req.queries("b"), ["2"]);
        assertEquals(req.queries("c"), []);
        assertEquals(req.query("a"), "1");
        assertEquals(req.query("b"), "2");
        assert(!req.query("c"));

        const originalRequest = await req.getOriginalRequest();
        assertNotStrictEquals(originalRequest, req);

        res.body = "hello world";
      });

      const res = await fetch(`${baseUrl}?a=1&b=2&a=2`);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "hello world");

      assertEquals(callStack, [1]);
      callStack.length = 0;
      await app.close();
    });

    await t.step("params", async () => {
      const callStack: number[] = [];
      const { app, baseUrl } = await createApp(AppModule);

      app.get("/user/:id", (req, res) => {
        callStack.push(1);
        assertEquals(req.param("id"), "1");
        assertEquals(req.params(), { id: "1" });

        res.body = "hello world";
      });

      const res = await fetch(`${baseUrl}/user/1`);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "hello world");

      assertEquals(callStack, [1]);
      callStack.length = 0;
      await app.close();
    });

    await t.step("cookies and headers", async () => {
      const callStack: number[] = [];
      const { app, baseUrl } = await createApp(AppModule);

      app.get("/", async (req, res) => {
        callStack.push(1);
        assertEquals(await req.cookies(), { a: "1", b: "2" });
        assertEquals(await req.cookie("a"), "1");
        assertEquals(await req.cookie("b"), "2");
        assert(!await req.cookie("c"));

        const headers = req.headers();
        assertEquals(headers.a, "3");
        assertEquals(headers.b, "4");
        assertEquals(req.header("a"), "3");
        assertEquals(req.header("b"), "4");
        assert(!req.header("c"));

        res.body = "hello world";
      });

      const res = await fetch(`${baseUrl}`, {
        headers: {
          cookie: "a=1;b=2",
          a: "3",
          b: "4",
        },
      });
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "hello world");

      assertEquals(callStack, [1]);
      callStack.length = 0;
      await app.close();
    });

    await t.step("form", async () => {
      const callStack: number[] = [];

      @Controller("")
      class A {
        @Post("/")
        post(@Form() body: any) {
          callStack.push(1);
          return body;
        }
      }
      @Module({ controllers: [A] })
      class AppModule {}

      const app = await NestFactory.create(AppModule, Router);
      const port = await getPort();
      app.listen({ port });
      await delay(100);

      const res = await fetch(`http://localhost:${port}/`, {
        method: "POST",
        body: new URLSearchParams({ a: "1", b: "2" }),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      });
      assertEquals(callStack, [1]);
      assertEquals(res.status, 200);
      assertEquals(await res.json(), { a: "1", b: "2" });

      callStack.length = 0;
      await app.close();
    });

    await t.step("formdata", async () => {
      const callStack: number[] = [];
      const data = new FormData();
      data.append("a", "1");
      data.append("b", "2");
      data.append("c", new Blob(["hello world"]), "hello.txt");

      @Controller("")
      class A {
        @Post("/")
        post(@Form() body: any) {
          callStack.push(1);
          // console.log(body);
          assert(body);
          assertEquals(body.a, "1");
          assertEquals(body.b, "2");
          assert(body.c instanceof File);
          assertEquals(body.c.name, "hello.txt");
          return "hello world";
        }
      }
      @Module({ controllers: [A] })
      class AppModule {}

      const app = await NestFactory.create(AppModule, Router);
      const port = await getPort();
      app.listen({ port });
      await delay(100);

      const res = await fetch(`http://localhost:${port}/`, {
        method: "POST",
        body: data,
      });
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "hello world");
      assertEquals(callStack, [1]);

      callStack.length = 0;
      await app.close();
    });
  });

  Deno.test(
    `${type} static serve`,
    { sanitizeOps: false, sanitizeResources: false },
    async (t) => {
      await t.step("static without prefix", async (it) => {
        @Module({ controllers: [] })
        class AppModule {}

        const app = await NestFactory.create(AppModule, Router);
        app.useStaticAssets(`tests/static`);

        const port = await getPort();
        app.listen({ port });
        await delay(100);

        await it.step("fetch /", async () => {
          const res = await fetch(`http://localhost:${port}/`);
          assertEquals(res.status, 200);
          assert(res.headers.get("content-type")?.includes("text/html"));
          await res.body?.cancel();
        });

        await it.step("fetch /index.html", async () => {
          const res = await fetch(`http://localhost:${port}/index.html`);
          assertEquals(res.status, 200);
          assert(res.headers.get("content-type")?.includes("text/html"));
          await res.body?.cancel();
        });

        await it.step("fetch /favicon.ico", async () => {
          const res = await fetch(`http://localhost:${port}/favicon.ico`);
          assertEquals(res.status, 200);
          assert(res.headers.get("content-type")?.startsWith("image"));
          await res.body?.cancel();
        });

        await it.step("fetch /child/test.js", async () => {
          const res = await fetch(`http://localhost:${port}/child/test.js`);
          assertEquals(res.status, 200);
          assert(
            res.headers.get("content-type")?.includes("javascript"),
          );
          await res.body?.cancel();
        });

        await it.step("fetch not exist file", async () => {
          const res = await fetch(`http://localhost:${port}/not-exist`);
          assertEquals(res.status, 404);
          await res.body?.cancel();
        });

        await app.close();
      });
    },
  );
}
