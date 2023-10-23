import {
  assert,
  assertEquals,
  assertFalse,
  assertRejects,
} from "../../test_deps.ts";
import { Reflect } from "../../deps.ts";
import { Injectable } from "../decorators/inject.ts";
import { Scope } from "../interfaces/scope-options.interface.ts";
import {
  clearAllFactoryCaches,
  Factory,
  globalFactoryCaches,
  initProvider,
  META_CONTAINER_KEY,
  setFactoryCaches,
} from "./class.factory.ts";

Deno.test("Factory without providers", async () => {
  class A {
  }

  const a = await Factory(A);

  assert(a instanceof A);

  const b = await Factory(A);
  assertEquals(a, b, "Factory should return the same instance");

  // const c = await Factory(A, Scope.REQUEST);
  // assert(a !== c, "Factory should return different instance");

  const d = await Factory(A, Scope.TRANSIENT);
  assert(a !== d, "Factory should return different instance");
});

Deno.test("Factory with providers", async () => {
  const Controller = (): ClassDecorator => () => {};

  const callStack: number[] = [];

  @Injectable()
  class B {
  }

  @Injectable({
    scope: Scope.TRANSIENT,
  })
  class C {
    constructor() {
      assertFalse(
        Reflect.getMetadata(META_CONTAINER_KEY, this),
        "C not be injected metadata in constructor",
      );
    }

    __post__init__() {
      callStack.push(1);
    }
  }

  @Controller()
  class A {
    constructor(public readonly b: B, public readonly c: C) {
    }
  }

  const a = await Factory(A);
  assert(a.b);
  assert(a.b instanceof B);
  assert(a.c);
  assert(a.c instanceof C);

  assertEquals(callStack, [1]);

  const a1 = await Factory(A);
  assert(a === a1, "Factory should return the same instance");
  assert(a.b === a1.b, "B should return the same instance");
  assert(a.c === a1.c, "C should return the same instance");

  assertEquals(callStack, [1]);

  assertEquals(Reflect.getMetadata(META_CONTAINER_KEY, a), undefined);
  assertEquals(Reflect.getMetadata(META_CONTAINER_KEY, a.b), undefined);
  assert(
    Reflect.getMetadata(META_CONTAINER_KEY, a.c) === A,
    "C should record the parent class A",
  );
});

Deno.test("initProvider", async (t) => {
  class A {
  }

  const a = await initProvider(A);
  assert(a instanceof A);

  // const c = await initProvider(A, Scope.REQUEST);
  // assert(c !== a);

  const d = await initProvider(A, Scope.TRANSIENT);
  assert(d !== a);

  await t.step("useExisting", async () => {
    const provider = {
      provide: "a",
      useExisting: A,
    };
    const b = await initProvider(provider);
    assert(b === a);

    const provider2 = {
      provide: "b",
      useExisting: "a",
    };
    const e = await initProvider(provider2);
    assert(e === a);

    const provider3 = {
      provide: "c",
      useExisting: "d",
    };
    await assertRejects(
      () => initProvider(provider3),
    ); // Cannot find provider for "d".
  });

  await t.step("useValue", async () => {
    const provider = {
      provide: "a",
      useValue: "b",
    };
    const b = await initProvider(provider);
    assertEquals(b, provider.useValue);
  });

  await t.step("useClass", async () => {
    const provider = {
      provide: "a",
      useClass: A,
    };
    const b = await initProvider(provider);
    assert(b === a);

    class B {}
    const provider2 = {
      provide: "b",
      useClass: B,
    };
    const e = await initProvider(provider2);
    assert(e instanceof B);
  });

  await t.step("useFactory", async () => {
    const provider = {
      provide: "a",
      useFactory: () => "b",
    };
    const b = await initProvider(provider);
    assertEquals(b, provider.useFactory());
  });

  await t.step("useFactory with inject", async () => {
    const callStack: number[] = [];
    const provider = {
      provide: "a",
      useFactory: (b: string) => {
        callStack.push(1);
        assertEquals(b, "b");
        return "c";
      },
      inject: ["b"],
    };
    const res = await initProvider(provider);
    assertEquals(res, "c");
    assertEquals(callStack, [1]);
  });

  await t.step("useFactory with inject class", async () => {
    const callStack: number[] = [];
    class B {}
    const provider = {
      provide: "a",
      useFactory: (b: B) => {
        callStack.push(1);
        assert(b instanceof B);
        return "c";
      },
      inject: [B],
    };
    const res = await initProvider(provider);
    assertEquals(res, "c");
    assertEquals(callStack, [1]);
  });
});

Deno.test("caches", () => {
  setFactoryCaches("a", "b");
  assertEquals(globalFactoryCaches.get("a"), "b");

  clearAllFactoryCaches();
  assertEquals(globalFactoryCaches.size, 0);
});
