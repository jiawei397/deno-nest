import { type DynamicModule, Module } from "@nest/core";
import { MongoFactory } from "deno_mongo_schema";

@Module({})
export class MongoModule {
  static forRoot(db: string): DynamicModule {
    return {
      module: MongoModule,
      providers: [
        {
          provide: MongoModule,
          useFactory: () => { // can be async
            return MongoFactory.forRoot(db);
          },
        },
      ],
    };
  }
}
