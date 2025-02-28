// deno-lint-ignore-file require-await no-unused-vars
import { assert, assertEquals } from "../tests/test_deps.ts";
import {
  createMockApp,
  createMockContext,
  mockCallMethod,
} from "../tests/common_helper.ts";
import { Controller, Get } from "./decorators/controller.ts";
import { Injectable } from "./decorators/inject.ts";
import { UseGuards } from "./guard.ts";
import {
  checkByInterceptors,
  compose,
  getInterceptors,
  UseInterceptors,
} from "./interceptor.ts";
import type {
  CanActivate,
  Context,
  NestInterceptor,
  Next,
} from "./interfaces/mod.ts";

Deno.test("UseInterceptors sort", async (t) => {
  const callStack: number[] = [];

  class GlobalInterceptor implements NestInterceptor {
    async intercept(_ctx: Context, next: Next) {
      callStack.push(1);
      await next();
      callStack.push(2);
    }
  }

  class ControllerInterceptor implements NestInterceptor {
    async intercept(_ctx: Context, next: Next) {
      callStack.push(3);
      await next();
      callStack.push(4);
    }
  }

  class Interceptor1 implements NestInterceptor {
    async intercept(_ctx: Context, next: Next) {
      callStack.push(5);
      await next();
      callStack.push(6);
    }
  }
  class Interceptor2 implements NestInterceptor {
    async intercept(_ctx: Context, next: Next) {
      callStack.push(7);
      await next();
      callStack.push(8);
    }
  }

  @UseInterceptors(ControllerInterceptor)
  class TestController {
    @UseInterceptors(Interceptor1, Interceptor2)
    a() {
      return "a";
    }

    b() {
      return "b";
    }
  }

  const test = new TestController();

  await t.step("a", async () => {
    const interceptors = await getInterceptors(test, test.a, [
      GlobalInterceptor,
    ]);
    assertEquals(interceptors.length, 4);
    assert(interceptors[0] instanceof GlobalInterceptor);
    assert(interceptors[1] instanceof ControllerInterceptor);
    assert(interceptors[2] instanceof Interceptor1);
    assert(interceptors[3] instanceof Interceptor2);
  });

  await t.step("b", async () => {
    const interceptors = await getInterceptors(test, test.b, [
      GlobalInterceptor,
    ]);
    assertEquals(interceptors.length, 2);
    assert(interceptors[0] instanceof GlobalInterceptor);
    assert(interceptors[1] instanceof ControllerInterceptor);
  });

  await t.step("get a", async () => {
    const ctx = createMockContext({
      path: "/a",
      method: "GET",
    });
    await checkByInterceptors(
      ctx,
      [
        GlobalInterceptor,
      ],
      test.a,
      {
        target: test,
        args: [],
        methodName: "a",
        methodType: "GET",
        fn: test.a,
        next: () => {
          test.a();
        },
      },
    );
    assertEquals(callStack, [1, 3, 5, 7, 8, 6, 4, 2]);
    callStack.length = 0;
  });

  await t.step("get b", async () => {
    const ctx = createMockContext({
      path: "/b",
      method: "GET",
    });
    await checkByInterceptors(
      ctx,
      [
        GlobalInterceptor,
      ],
      test.b,
      {
        target: test,
        args: [],
        methodName: "b",
        methodType: "GET",
        fn: test.b,
        next: () => {
          test.b();
        },
      },
    );
    assertEquals(callStack, [1, 3, 4, 2]);
    callStack.length = 0;
  });
});

Deno.test("UseInterceptors cache", async (t) => {
  const callStack: number[] = [];

  class CacheInterceptor implements NestInterceptor {
    caches = new Set<number>();

    async intercept(ctx: Context, next: Next) {
      if (this.caches.has(1)) {
        ctx.response.body = "cached";
        return;
      }
      this.caches.add(1);
      callStack.push(1);
      await next();
      callStack.push(2);
    }
  }

  @UseInterceptors(CacheInterceptor)
  class TestController {
    a() {
      callStack.push(3);
      return "a";
    }
  }

  const test = new TestController();
  const ctx = createMockContext({
    path: "/a",
    method: "GET",
  });

  await t.step("first get", async () => {
    await checkByInterceptors(
      ctx,
      [],
      test.a,
      {
        target: test,
        args: [],
        methodName: "a",
        methodType: "GET",
        fn: test.a,
        next: () => {
          test.a();
        },
      },
    );
    assertEquals(callStack, [1, 3, 2]);
    callStack.length = 0;
  });

  await t.step("second get", async () => {
    await checkByInterceptors(
      ctx,
      [],
      test.a,
      {
        target: test,
        args: [],
        methodName: "a",
        methodType: "GET",
        fn: test.a,
        next: () => {
          test.a();
        },
      },
    );
    assertEquals(ctx.response.body, "cached");
    assertEquals(callStack, []);

    callStack.length = 0;
  });
});

Deno.test("UseInterceptors intercept", async () => {
  const callStack: number[] = [];

  class Interceptor implements NestInterceptor {
    async intercept(ctx: Context, _next: Next) {
      callStack.push(1);
      ctx.response.body = "intercepted";
    }
  }

  @UseInterceptors(Interceptor)
  class TestController {
    a() {
      callStack.push(2);
      return "a";
    }
  }

  const test = new TestController();

  const ctx = createMockContext({
    path: "/a",
    method: "GET",
  });
  await checkByInterceptors(
    ctx,
    [],
    test.a,
    {
      target: test,
      args: [],
      methodName: "a",
      methodType: "GET",
      fn: test.a,
      next: () => {
        test.a();
      },
    },
  );
  assertEquals(ctx.response.body, "intercepted");
  assertEquals(callStack, [1]);

  callStack.length = 0;
});

Deno.test("interceptors with controller", async (t) => {
  const callStack: number[] = [];

  @Injectable()
  class GlobalInterceptor implements NestInterceptor {
    async intercept(_ctx: Context, next: Next) {
      callStack.push(1);
      await next();
      callStack.push(2);
    }
  }

  @Injectable()
  class ErrorInterceptor implements NestInterceptor {
    async intercept(ctx: Context, next: Next) {
      callStack.push(3);
      try {
        await next();
      } catch (error) {
        callStack.push(4);
        ctx.response.body = "catched";
      }
    }
  }

  @Injectable()
  class LogInterceptor implements NestInterceptor {
    async intercept(ctx: Context, next: Next) {
      callStack.push(5);
      try {
        await next();
      } catch (error) {
        callStack.push(6);
        throw error;
      } finally {
        callStack.push(7);
      }
    }
  }

  @UseInterceptors(GlobalInterceptor)
  @Controller("")
  class A {
    @Get("/a")
    a() {
      throw new Error("a error");
    }

    @Get("/b")
    @UseInterceptors(ErrorInterceptor)
    b() {
      throw new Error("b error");
    }

    @Get("/c")
    @UseInterceptors(LogInterceptor)
    c() {
      throw new Error("c error");
    }
  }

  await t.step("with error", async () => {
    const ctx = createMockContext({
      path: "/a",
      method: "GET",
    });
    const app = createMockApp();
    app.addController(A);

    await mockCallMethod(app, ctx);
    assertEquals(callStack, [1]);
    assertEquals(ctx.response.status, 500);
    assertEquals(ctx.response.body, {
      statusCode: 500,
      message: "a error",
      error: "Internal Server Error",
    });

    callStack.length = 0;
  });

  await t.step("with error and catch", async () => {
    const ctx = createMockContext({
      path: "/b",
      method: "GET",
    });
    const app = createMockApp();
    app.addController(A);
    await mockCallMethod(app, ctx);

    assertEquals(callStack, [1, 3, 4, 2]);
    assertEquals(ctx.response.body, "catched");

    callStack.length = 0;
  });

  await t.step("with error and no catch, only log", async () => {
    const ctx = createMockContext({
      path: "/c",
      method: "GET",
    });
    const app = createMockApp();
    app.addController(A);
    await mockCallMethod(app, ctx);

    assertEquals(callStack, [1, 5, 6, 7]);
    assertEquals(ctx.response.status, 500);
    assertEquals(ctx.response.body, {
      statusCode: 500,
      message: "c error",
      error: "Internal Server Error",
    });

    callStack.length = 0;
  });
});

Deno.test("interceptors and guard", async (t) => {
  const callStack: number[] = [];

  @Injectable()
  class GlobalInterceptor implements NestInterceptor {
    async intercept(_ctx: Context, next: Next) {
      callStack.push(1);
      await next();
      callStack.push(2);
    }
  }

  @Injectable()
  class AuthGuard implements CanActivate {
    async canActivate(_context: Context): Promise<boolean> {
      callStack.push(3);
      return false;
    }
  }

  @Injectable()
  class AuthGuard2 implements CanActivate {
    async canActivate(_context: Context): Promise<boolean> {
      callStack.push(4);
      return true;
    }
  }

  @UseInterceptors(GlobalInterceptor)
  @Controller("")
  class A {
    @Get("/a")
    @UseGuards(AuthGuard)
    a() {
      throw new Error("a error");
    }

    @UseGuards(AuthGuard2)
    @Get("/b")
    b() {
      return "b";
    }

    @Get("/c")
    @UseGuards(AuthGuard2)
    c() {
      throw new Error("c error");
    }
  }

  await t.step("guard not pass", async () => {
    const ctx = createMockContext({
      path: "/a",
      method: "GET",
    });
    const app = createMockApp();
    app.addController(A);

    await mockCallMethod(app, ctx);
    assertEquals(callStack, [3]);

    callStack.length = 0;
  });

  await t.step("guard pass", async () => {
    const ctx = createMockContext({
      path: "/b",
      method: "GET",
    });
    const app = createMockApp();
    app.addController(A);

    await mockCallMethod(app, ctx);
    assertEquals(callStack, [4, 1, 2]);

    callStack.length = 0;
  });

  await t.step("guard pass but throw error", async () => {
    const ctx = createMockContext({
      path: "/c",
      method: "GET",
    });
    const app = createMockApp();
    app.addController(A);

    await mockCallMethod(app, ctx);
    assertEquals(callStack, [4, 1]);

    callStack.length = 0;
  });
});

Deno.test("compose", async (t) => {
  await t.step("compose should call interceptors in order", async () => {
    const callStacks: number[] = [];

    const mockInterceptors = [
      {
        intercept: async (context: Context, next: Next) => {
          callStacks.push(1);
          await next();
          callStacks.push(4);
        },
      },
      {
        intercept: async (context: Context, next: Next) => {
          callStacks.push(2);
          await next();
          callStacks.push(3);
        },
      },
    ];

    const next = async () => {
      callStacks.push(0);
    };
    const context = createMockContext({
      path: "/a",
      method: "GET",
    });

    const composedInterceptors = compose(mockInterceptors);
    await composedInterceptors(context, next);

    assertEquals(callStacks, [1, 2, 0, 3, 4]);
  });

  await t.step("compose should call next() if interceptors is empty", () => {
    const callStacks: number[] = [];
    const mockInterceptors: NestInterceptor[] = [];

    const next = async () => {
      callStacks.push(1);
      return;
    };
    const context = createMockContext({
      path: "/a",
      method: "GET",
    });

    const composedInterceptors = compose(mockInterceptors);
    composedInterceptors(context, next);
    assertEquals(callStacks, [1]);
  });

  await t.step("next is empty", () => {
    const mockInterceptors: NestInterceptor[] = [];

    const context = createMockContext({
      path: "/a",
      method: "GET",
    });

    const composedInterceptors = compose(mockInterceptors);
    composedInterceptors(context);
    assert(true, "next is empty");
  });
});
