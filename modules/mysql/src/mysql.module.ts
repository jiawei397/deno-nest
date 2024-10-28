import { type DynamicModule, Module, red } from "@nest/core";
import { MYSQL_KEY } from "./mysql.constant.ts";
import {
  type Connection,
  type ConnectionOptions,
  createConnection,
} from "mysql/promise";

@Module({})
export class MysqlModule {
  static client: Connection;

  static forRoot(config: ConnectionOptions): DynamicModule {
    return {
      module: MysqlModule,
      providers: [{
        provide: MYSQL_KEY,
        useFactory: async () => { // can be async
          const { database, ...others } = config;
          try {
            const connection = await createConnection(
              database ? others : config,
            );
            console.info("connect to mysql success");
            if (database) {
              await connection.query(
                `CREATE DATABASE IF NOT EXISTS ${database}`,
              );
              await connection.query(`USE ${database}`);
              console.debug("create database success");
            }
            this.client = connection;
            return connection;
          } catch (e) {
            console.error(
              "connect to mysql error",
              red((e as Error).stack || e as string),
            );
          }
        },
      }],
      exports: [MYSQL_KEY],
      global: true,
    };
  }

  static getClient(): Connection {
    return this.client;
  }
}
