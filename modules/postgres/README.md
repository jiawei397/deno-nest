# @nest/postgres

This is a Postgres module for [`deno_nest`](https://nests.deno.dev/en-US).
Currently used Postgres client is [npm:postgres@^3.4.5](https://www.npmjs.com/package/postgres).

If you want to use another Postgres client, you can refer to the code for this
module, there are not many lines.

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/postgres": "jsr:@nest/postgres@^0.0.2"
  }
}
```

You can change the `postgres` version by yourself.

Then `app.modules.ts`:

```typescript
import { Module } from "@nest/core";
import { PostgresModule } from "@nest/postgres";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    PostgresModule.forRoot({
      hostname: "10.100.30.65",
      port: 5433,
      max: 20,
      debug: true,
      user: "root",
      connect_timeout: 5,
      database: "database", // You must ensure that the database exists, and the program will not automatically create it
      password: "uinnova2022", // One thing that must be taken into consideration is that passwords contained inside the URL must be properly encoded in order to be passed down to the database. You can achieve that by using the JavaScript API encodeURIComponent and passing your password as an argument.
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Then can be used in AppController:

```ts
import { Controller, Get, Inject, Query } from "@nest/core";
import { type Sql, POSTGRES_KEY } from "@nest/postgres";

type Company = {
  id: number;
  name: string;
  age: number;
  address: string;
  salary: number;
};

@Controller("")
export class AppController {
  constructor(@Inject(POSTGRES_KEY) private readonly sql: Sql) {}

  @Get("/createCompanyTable")
  async createCompanyTable() {
    await this.sql`DROP TABLE IF EXISTS COMPANY`;
    const result = await this.sql`
      CREATE TABLE COMPANY(
        ID INT PRIMARY KEY     NOT NULL,
        NAME           TEXT    NOT NULL,
        AGE            INT     NOT NULL,
        ADDRESS        CHAR(50),
        SALARY         REAL
    );
    `;
    return result;
  }

  @Get("/createCompany")
  async createCompany(
    @Query("username") username: string,
    @Query("id") id: number,
  ) {
    console.info("Creating company " + username, 'with id', id);
    const result = await this
      .sql`INSERT INTO COMPANY (ID,NAME,AGE,ADDRESS,SALARY) VALUES (${id}, ${username}, 32, 'California', 20000.00)`;
    console.log(result);
    return result;
  }

  @Get("/updateCompany")
  async updateCompany(@Query("id") id: number) {
    console.info("Updating company " + id);
    const result = await this
      .sql`UPDATE COMPANY SET SALARY = 15000 WHERE ID = ${id}`;
    console.log(result);
    return result;
  }

  @Get('/queryCompany')
  async queryCompany(@Query("id") id: number) {
    console.info("Query company " + id);
    const result = await this.sql`SELECT * FROM COMPANY WHERE ID = ${id}`;
    console.log(result);
    return result;
  }

  @Get('list')
  async list() {
    const result = await this.sql<Company[]>`SELECT * FROM COMPANY`;
    console.log(result);
    return result;
  }
}
```

More can see the example dir.
