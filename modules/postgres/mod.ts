import type { Options, Sql } from "postgres";

export type { Options as PostgresOptions, Sql as Client, Sql };
export * from "./src/postgres.module.ts";
export * from "./src/postgres.constant.ts";
