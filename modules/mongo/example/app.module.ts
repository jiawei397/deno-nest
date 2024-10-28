import { Module } from "@nest/core";
import { MongoModule } from "@nest/mongo";
import { UserModule } from "./user/user.module.ts";

@Module({
  imports: [
    MongoModule.forRoot("mongodb://root:123456@192.168.21.125:27017/test?authSource=admin"),
    UserModule,
  ],
  controllers: [],
})
export class AppModule {}
