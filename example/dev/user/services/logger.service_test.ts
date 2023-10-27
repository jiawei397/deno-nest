import { assert, createTestingModule } from "@nest/tests";
import { LoggerService } from "./logger.service.ts";

Deno.test("logger service test", async () => {
  const moduleRef = await createTestingModule({
    providers: [LoggerService],
  })
    .compile();
  const loggerService = await moduleRef.get(LoggerService);
  const loggerService2 = await moduleRef.get(LoggerService);

  assert(loggerService !== loggerService2, "service is not singleton");
});