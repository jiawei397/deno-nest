# @nest/mongo

This is a `mongodb` module for [`deno_nest`](https://nests.deno.dev/en-US).

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/mongo": "jsr:@nest/mongo@^0.0.1"
  }
}
```

app.module.ts:

```typescript
import { Module } from "@nest/core";
import { MongoModule } from "@nest/mongo";
import { UserModule } from "./user/user.module.ts";

@Module({
  imports: [
    MongoModule.forRoot("mongodb://localhost:27017/test"),
    UserModule,
  ],
  controllers: [],
})
export class AppModule {}
```

More can see the example dir.
