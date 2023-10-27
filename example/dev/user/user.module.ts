import { Module } from "@nest";
import { AsyncModule } from "../asyncModule/async.module.ts";
import { RoleController } from "./controllers/role.controller.ts";
import { UserController } from "./controllers/user.controller.ts";
import { User2Controller } from "./controllers/user2.controller.ts";
import { ScheduleService } from "./services/schedule.service.ts";

@Module({
  imports: [
    AsyncModule,
  ],
  controllers: [
    UserController,
    RoleController,
    User2Controller,
  ],
  providers: [
    {
      provide: "CONNECTION",
      useValue: "connected",
    },
    ScheduleService,
  ],
})
export class UserModule {
}