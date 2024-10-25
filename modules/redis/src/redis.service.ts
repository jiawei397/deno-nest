// deno-lint-ignore-file no-explicit-any
import { Inject, Injectable } from "@nest/core";
import type { Redis } from "../deps.ts";
import { REDIS_KEY } from "./redis.constant.ts";
import { jsonParse, stringify } from "./utils.ts";

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_KEY) public readonly client: Redis) {}

  // 设置值的方法
  set(key: string, value: any, seconds?: number): Promise<string | null> {
    value = stringify(value);
    return this.client.set(key, value, seconds ? { EX: seconds } : undefined);
  }

  // 获取值的方法
  async get(key: string): Promise<any> {
    const data = await this.client.get(key);
    return jsonParse(data);
  }

  // 推送到数组
  async push(key: string, value: any): Promise<number> {
    value = stringify(value);
    return await this.client.rPush(key, value);
  }

  // 推送到数组第一项
  async unshift(key: string, value: any): Promise<number> {
    value = stringify(value);
    return await this.client.lPush(key, value);
  }

  // 去掉第一个
  async shift(key: string): Promise<any> {
    const data = await this.client.lPop(key);
    return jsonParse(data);
  }

  // 删除最后一个
  async pop(key: string): Promise<any> {
    const data = await this.client.rPop(key);
    return jsonParse(data);
  }

  // 根据索引获取
  async index(key: string, index: number): Promise<any> {
    const data = await this.client.lIndex(key, index);
    return jsonParse(data);
  }

  async size(key: string): Promise<number> {
    return await this.client.lLen(key);
  }

  async isEmpty(key: string): Promise<boolean> {
    const len = await this.size(key);
    return len === 0;
  }

  getRange(key: string, start: number, end: number): Promise<string[]> {
    return this.client.lRange(key, start, end);
  }
}
