// deno-lint-ignore-file verbatim-module-syntax
import { assert, Controller, Get } from "@nest/core";
import { ElasticsearchService } from "@nest/elasticsearch";

@Controller("")
export class AppController {
  constructor(private readonly elasticSearchService: ElasticsearchService) {
    assert(
      this.elasticSearchService,
      "injected elasticSearchService maybe exist",
    );
  }
  @Get("/")
  getById() {
    return this.elasticSearchService.get({
      index: "document_doc_api2",
      id: "thingjs-api10_62b80206cd02b2892ff4ee8f",
    });
  }

  @Get('index')
  async createIndex() {
    const info = await this.elasticSearchService.indices.create({
      index: "myindex",
      body: {
        "mappings": {
          "properties": {
            "title": {
              "type": "text",
            },
            // "content": {
            //   "type": "percolator",
            // },
          },
        },
      },
    });
    console.log(info);
    return info;
  }

  @Get("save")
  async save() {
    const info = await this.elasticSearchService.index({
      index: "myindex",
      id: "AUA9wn0BCqCFQFsiKm3G", // if no id , it will create one
      body: {
        "title": "hello",
        "content": "world",
      },
    });
    console.log(info);
    return info;
  }

  @Get('count')
  async count(){
    const info = await this.elasticSearchService.count({
      index: "myindex",
    });
    console.log(info);
    return info;
  }
}
