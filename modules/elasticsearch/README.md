# @nest/elasticsearch

This is a redis module for [`deno_nest`](https://nests.deno.dev/en-US).

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/elasticsearch": "jsr:@nest/elasticsearch@^0.0.1"
  }
}
```

Then use in `AppModule`:

```typescript
import { Module } from "@nest/core";
import { ElasticsearchModule } from "@nest/elasticsearch";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    ElasticsearchModule.forRoot({
      node: "http://elastic:369258@192.168.21.176:9200",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Then can be used in AppController:

```ts
import { assert, Controller, Get } from "@nest/core";
import { ElasticsearchService } from "@nest/elasticsearch";

@Controller("")
export class AppController {
  constructor(private readonly elasticSearchService: ElasticsearchService) {}
  @Get("/")
  getById() {
    return this.elasticSearchService.get({
      index: "blog",
      id: "60f69db67cd836379015f256",
    });
  }
}
```

More can see the example dir.
