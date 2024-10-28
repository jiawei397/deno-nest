import { Module } from "@nest/core";
import { MysqlModule } from "@nest/mysql";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    MysqlModule.forRoot({
      host: "10.100.30.65",
      user: "root",
      port: 3306,
      database: "test",
      pool: 3, // connection limit
      password: "123456",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
