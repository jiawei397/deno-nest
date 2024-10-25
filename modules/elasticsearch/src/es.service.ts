import { Inject, Injectable } from "@nest/core";
import { Client, type ClientOptions } from "elasticsearch";
import { ES_KEY } from "./es.constant.ts";

@Injectable()
export class ElasticsearchService extends Client {
  constructor(@Inject(ES_KEY) options: ClientOptions) {
    super(options);
  }
}
