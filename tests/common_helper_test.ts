// deno-lint-ignore-file no-explicit-any require-await
import {
  Controller,
  Delete,
  Patch,
  Post,
  Put,
  Res,
  type Response,
} from "@nest/core";
import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "./test_deps.ts";
import {
  createMockApp,
  createMockContext,
  createMockRouter,
  findUnusedPort,
  mockCallMethod,
  type MockOptions,
} from "./common_helper.ts";

Deno.test("findUnusedPort", async () => {
  const port1 = 4000;
  const listener1 = Deno.listen({ port: port1 });
  const port = await findUnusedPort();
  assertNotEquals(port, port1);
  listener1.close();
});

Deno.test("createMockRouter", async (t) => {
  const router = createMockRouter();

  await t.step("use", () => {
    router.use(async (ctx, next) => {
      ctx.response.body = "Hello, world!";
      await next();
    });
    assertEquals(router.map.get("GET")!.size, 1);
    assertEquals(router.map.get("POST")!.size, 1);
    assertEquals(router.map.get("PATCH")!.size, 1);
    assertEquals(router.map.get("PUT")!.size, 1);
    assertEquals(router.map.get("DELETE")!.size, 1);
  });

  await t.step("not implement", () => {
    assertEquals(
      router.notFound(async (ctx) => {
        ctx.response.body = "Not Found";
      }),
      undefined,
    );

    assertEquals(router.routes(), undefined);
    assertEquals(router.serveForStatic(), undefined);
    assertEquals(
      router.startServer({
        onListen: () => {},
      }),
      undefined,
    );
    assertThrows(() => router.useOriginMiddleware(() => {}));
  });
});

Deno.test("createMockContext - returns expected context object", async (t) => {
  const options: MockOptions = {
    path: "/test",
    method: "GET",
    body: {
      type: "json",
      value: { foo: "bar" },
    },
    reqHeaders: { "User-Agent": "test" },
    cookies: { sessionId: "123" },
    params: { id: "123" },
    queries: { search: "test", page: ["1", "2"] },
  };

  const ctx = createMockContext(options);

  await t.step("context", async () => {
    assertEquals(ctx.request.method, options.method);
    assertEquals(ctx.request.url, `http://localhost${options.path}`);
    assertEquals(await ctx.request.json(), options.body?.value);
    assertEquals(await ctx.request.formData(), options.body?.value as any);
    assertEquals(await ctx.request.text(), options.body?.value as any);
    assertEquals(
      ctx.request.header("User-Agent"),
      options.reqHeaders?.["User-Agent"],
    );
    assertEquals(ctx.request.params(), options.params);
    assertEquals(ctx.request.param("id"), options.params?.id);
    assertEquals(ctx.request.queries("search"), [options.queries?.search]);
    assertEquals(ctx.request.queries("page"), options.queries?.page);
    assertEquals(ctx.request.queries("search2"), []);

    assertEquals(ctx.request.query("search2"), undefined);
    assertEquals(ctx.request.query("search"), options.queries?.search);
    assertEquals(ctx.request.query("page"), options.queries?.page[0]);
    assertEquals(ctx.response.body, options.body?.value);
    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.statusText, "");
    assertEquals(ctx.response.render(), undefined);
  });

  await t.step("cookies", async () => {
    assertEquals(ctx.request.cookies, ctx.response.cookies);
    assertEquals(ctx.cookies, ctx.request.cookies);

    const cookies = ctx.cookies;

    assertEquals(await cookies.getAll(), options.cookies);
    assertEquals(
      await cookies.get("sessionId"),
      options.cookies!.sessionId,
    );
    assertEquals(
      await cookies.get("sessionId2"),
      undefined,
    );
    assertEquals(await cookies.has("sessionId"), true);
    await cookies.set("sessionId", "456");
    assertEquals(
      await cookies.get("sessionId"),
      "456",
    );
    await cookies.set("sessionId", null);
    assertEquals(
      await cookies.get("sessionId"),
      undefined,
    );

    await cookies.set("sessionId", "456");
    cookies.delete("sessionId");
    assertEquals(
      await cookies.get("sessionId"),
      undefined,
    );

    assertEquals(await cookies.has("sessionId"), false);
  });

  await t.step("context - not implement", async () => {
    assertThrows(() => ctx.request.getOriginalRequest());
    assertThrows(() => ctx.response.getOriginalContext());
  });
});

Deno.test("mockCallMethod", async (t) => {
  await t.step("mockCallMethod - GET request", async () => {
    const app = createMockApp();
    app.get("/", (_req, res) => {
      res.body = "Hello, world!";
    });

    const ctx = createMockContext({
      path: "/",
      method: "GET",
    });

    const result = await mockCallMethod(app, ctx);
    assertEquals(result, undefined);

    assertEquals(ctx.response.body, "Hello, world!");
  });

  await t.step("mockCallMethod - POST request", async () => {
    const app = createMockApp();

    @Controller("/")
    class A {
      @Post("/")
      index(@Res() res: Response) {
        res.body = "Hello, world!";
      }
    }
    app.addController(A);

    const ctx = createMockContext({
      path: "/",
      method: "POST",
    });

    const result = await mockCallMethod(app, ctx);
    assertEquals(result, undefined);

    assertEquals(ctx.response.body, "Hello, world!");
  });

  await t.step("mockCallMethod - patch", async () => {
    const app = createMockApp();

    @Controller("/")
    class A {
      @Patch("/")
      index(@Res() res: Response) {
        res.body = "Hello, world!";
      }
    }
    app.addController(A);

    const ctx = createMockContext({
      path: "/",
      method: "PATCH",
    });

    const result = await mockCallMethod(app, ctx);
    assertEquals(result, undefined);

    assertEquals(ctx.response.body, "Hello, world!");
  });

  await t.step("mockCallMethod - delete", async () => {
    const app = createMockApp();

    @Controller("/")
    class A {
      @Delete("/")
      index(@Res() res: Response) {
        res.body = "Hello, world!";
      }
    }
    app.addController(A);

    const ctx = createMockContext({
      path: "/",
      method: "DELETE",
    });

    const result = await mockCallMethod(app, ctx);
    assertEquals(result, undefined);

    assertEquals(ctx.response.body, "Hello, world!");
  });

  await t.step("mockCallMethod - put", async () => {
    const app = createMockApp();

    @Controller("/")
    class A {
      @Put("/")
      index(@Res() res: Response) {
        res.body = "Hello, world!";
      }
    }
    app.addController(A);

    const ctx = createMockContext({
      path: "/",
      method: "PUT",
    });

    const result = await mockCallMethod(app, ctx);
    assertEquals(result, undefined);

    assertEquals(ctx.response.body, "Hello, world!");
  });

  await t.step("mockCallMethod - 404", async () => {
    const app = createMockApp();

    const ctx = createMockContext({
      path: "/",
      method: "GET",
    });

    await assertRejects(() => mockCallMethod(app, ctx));
  });
});
