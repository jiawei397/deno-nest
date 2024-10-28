import { assertEquals } from "@nest/tests";
import { OakRouter } from "./router.ts";

Deno.test("OakRouter startServer error", async (t) => {
  const router = new OakRouter();
  const callStacks: number[] = [];
  // deno-lint-ignore no-explicit-any
  const app = (router as any).app;

  await t.step("with onError", async () => {
    // deno-lint-ignore require-await
    app.listen = async () => {
      callStacks.push(0);
      throw new Error("listen");
    };
    await router.startServer({
      onListen: () => {
        callStacks.push(1);
      },
      onError(err) {
        callStacks.push(2);
        assertEquals((err as Error).message, "listen");
        return new Response();
      },
    });

    assertEquals(callStacks, [0, 2]);

    callStacks.length = 0;
  });

  await t.step("without onError", async () => {
    // deno-lint-ignore require-await
    app.listen = async () => {
      callStacks.push(0);
    };
    await router.startServer({
      onListen: () => {
        callStacks.push(1);
      },
    });

    assertEquals(callStacks, [0]);
  });
});
