import { type DynamicModule, Module } from "@nest/core";
import type { ClientOptions } from "elasticsearch";
import { ES_KEY } from "./es.constant.ts";
import { ElasticsearchService } from "./es.service.ts";

@Module({})
export class ElasticsearchModule {
  static forRoot(options: ClientOptions): DynamicModule {
    return {
      module: ElasticsearchModule,
      providers: [{
        provide: ES_KEY,
        useValue: options,
      }, ElasticsearchService],
      exports: [ElasticsearchService],
      global: true,
    };
  }
}
