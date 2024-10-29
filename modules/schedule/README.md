# @nest/schedule

This is a `schedule` module for [`deno_nest`](https://nests.deno.dev/en-US).

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/schedule": "jsr:@nest/schedule@^0.0.2",
  }
}
```

app.module.ts:

```typescript
import { Module } from "@nest/core";
import { ScheduleModule } from "@nest/schedule";
import { ScheduleService } from "./services/schedule.service.ts";
import { Test2Service } from "./services/test2.service.ts";

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [],
  providers: [
    {
      provide: "CONNECTION",
      useValue: "connected",
    },
    ScheduleService,
    Test2Service,
  ],
})
export class AppModule {}
```

Then `schedule.service.ts` may be like this:

```ts
import { assert, Injectable } from "@nest/core";
import { Cron, Interval, Timeout } from "@nest/schedule";
import { TestService } from "./test.service.ts";

@Injectable()
export class ScheduleService {
  constructor(private readonly testService: TestService) {}

  @Timeout(2000)
  onceJob() {
    assert(this.testService, "testService is not defined");
    console.log("-----once---", this.testService.info());
    setTimeout(() => { // this error only be catched by global error event listener
      throw new Error("once job error");
    }, 0);
  }

  @Timeout(1000)
  promiseError() {
    console.log("-----promise error---");
    new Promise((_resolve, reject) => { // this error only be catched by unhandledrejection event listener
      reject(new Error("promise error"));
    });
  }

  @Interval(5000)
  async intervalJob() {
    assert(this.testService, "testService is not defined");
    console.log("-----interval---", await this.testService.info());
    // throw new Error("interval job error");
  }

  @Cron("0 */1 * * * *")
  intervalOneMinuteJob() {
    assert(this.testService, "testService is not defined");
    console.info(
      `【${ScheduleService.name}】one minute interval job!`,
    );
  }

  @Cron("0 */2 * * * *")
  intervalTwoMinuteJob() {
    console.info(`【${ScheduleService.name}】two minute interval job!`);
  }
}
```

More can see the outer example dir.
