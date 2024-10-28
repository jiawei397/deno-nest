import { type DynamicModule, Module } from "@nest/core";
import postgres, { type Options, type Sql } from "postgres";
import { POSTGRES_KEY } from "./postgres.constant.ts";

@Module({})
export class PostgresModule {
  static sql: Sql;

  // deno-lint-ignore no-explicit-any
  static forRoot(config: Options<any>): DynamicModule {
    return {
      module: PostgresModule,
      providers: [
        {
          provide: POSTGRES_KEY,
          useFactory: async () => { 
            const sql = postgres(config);
            try {
              await sql`SELECT 1 AS connected`;
              console.log('connected to postgres successfully');
              this.sql = sql;
            } catch (error) {
              console.error("connect postgres", error);
              sql.end();
            }
            return sql;
          },
        },
      ],
      exports: [POSTGRES_KEY],
      global: true,
    };
  }
}
