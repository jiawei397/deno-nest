import { Module } from "@nest/core";
import { createStore, RedisModule } from "@nest/redis";
import { CacheModule } from "@nest/cache";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    RedisModule.forRoot({
      url: "redis://default:xxx@10.100.30.65:6379/1",
    }),
    CacheModule.register({
      ttl: 30,
      store: createStore,
      isDebug: true,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
