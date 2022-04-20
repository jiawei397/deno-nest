import { clearCacheTimeout, createTestingModule } from "../../../mod.ts";
import { assert, assertEquals } from "../../../test_deps.ts";
import { RoleService } from "./role.service.ts";

Deno.test("role service test", async () => {
  const moduleRef = await createTestingModule({
    providers: [{
      provide: "CONNECTION",
      useValue: "connected",
    }, RoleService],
  })
    .compile();
  const roleService = await moduleRef.get(RoleService);
  assertEquals(roleService["connection"], "connected");

  const start = Date.now();
  const result = await roleService.info();
  const time = Date.now() - start;
  assert(time >= 500, "has delay");

  const start2 = Date.now();
  const result2 = await roleService.info();
  const time2 = Date.now() - start2;
  assert(time2 < 10, "use cache");
  assertEquals(result, result2);

  clearCacheTimeout();
});
