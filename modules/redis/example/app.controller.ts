// deno-lint-ignore-file verbatim-module-syntax
import { assert, Controller, Get, Inject, UseInterceptors } from "@nest/core";
import { CacheInterceptor, SetCacheStore } from "@nest/cache";
import { type Redis, REDIS_KEY, RedisService } from "@nest/redis";

@Controller("")
export class AppController {
  constructor(
    private readonly redisService: RedisService,
    @Inject(REDIS_KEY) private readonly client: Redis,
  ) {
    assert(redisService, "redisService should be inited");
    assert(client, "redis client should be inited");
  }

  @Get("/")
  async version() {
    await this.redisService.set("version", "1.1.0");
    return this.redisService.get("version");
  }

  @Get("/client")
  @UseInterceptors(CacheInterceptor)
  async useInjectedClient() {
    await this.client.lPush("userIds", "123");
    const arr = await this.client.lRange("userIds", 0, -1);
    return arr;
  }

  @Get("/service")
  @UseInterceptors(CacheInterceptor)
  @SetCacheStore("redis")
  async userService() {
    await this.redisService.push("userIds", {
      id: 1,
    });
    // const arr = await this.redisService.getRange("userIds", 0, 10);
    const arr = await this.redisService.client.lRange("userIds", 0, -1);
    console.log("----");
    return arr;
  }

  @Get("testSet")
  async testSet() {
    await this.client.sRem("ids", "3");
    // await this.client.del("ids");
    const result = await this.client.sAdd("ids", "10");
    console.log(`result: ${result}`);
    const count = await this.client.sCard("ids");
    const data = await this.client.sMembers("ids");
    const hasNum = await this.client.sIsMember("ids", "5888");
    return {
      count,
      data,
      hasNum: !!hasNum,
    };
  }
}
