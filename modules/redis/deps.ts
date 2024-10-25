import { createClient, type RedisClientOptions, type RedisClientType, type RedisFunctions, type RedisModules, type RedisScripts } from "redis";

export type Redis = RedisClientType<RedisModules, RedisFunctions, RedisScripts>;

export {
  createClient,
  type RedisClientOptions,
} 
