import { Module } from "@nest/core";
import { PostgresModule } from "@nest/postgres";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    PostgresModule.forRoot({
      hostname: "10.100.30.65",
      port: 5433,
      max: 20,
      debug: true,
      user: "root",
      connect_timeout: 5,
      database: "database", // You must ensure that the database exists, and the program will not automatically create it
      password: "xxx", // One thing that must be taken into consideration is that passwords contained inside the URL must be properly encoded in order to be passed down to the database. You can achieve that by using the JavaScript API encodeURIComponent and passing your password as an argument.
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
