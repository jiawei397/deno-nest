# @nest/mysql

This is a mysql module for [`deno_nest`](https://nests.deno.dev/en-US).

The basic use is `npm:mysql2@^3.11.3`.

## example

Add import map in `deno.json`:

```json
{
  "imports": {
    "@nest/core": "jsr:@nest/core@^0.0.1",
    "@nest/hono": "jsr:@nest/hono@^0.0.1",
    "@nest/mysql": "jsr:@nest/mysql@^0.0.1"
  }
}
```

You can change mysql version by yourself.

Here is `app.module.ts`:

```typescript
import { Module } from "@nest/core";
import { MysqlModule } from "@nest/mysql";
import { AppController } from "./app.controller.ts";

@Module({
  imports: [
    MysqlModule.forRoot({
      host: "10.100.30.65",
      user: "root",
      port: 3306,
      database: "test",
      pool: 3, // connection limit
      password: "123456",
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

Then can be used in `AppController`:

```ts
import { assert, Controller, Get, Inject, Query } from "@nest/core";
import { type Client, MYSQL_KEY } from "@nest/mysql";

@Controller("")
export class AppController {
  constructor(@Inject(MYSQL_KEY) private readonly client: Client) {
    assert(this.client, "injected MYSQL_KEY maybe exist");
  }

  @Get("/createUserTable")
  async createUserTable() {
    // await this.client.execute(`CREATE DATABASE IF NOT EXISTS wiki`);
    // await this.client.execute(`USE wiki`);
    await this.client.execute(`DROP TABLE IF EXISTS users`);
    await this.client.execute(`
      CREATE TABLE users (
          id int(11) NOT NULL AUTO_INCREMENT,
          name varchar(100) NOT NULL,
          created_at timestamp not null default current_timestamp,
          PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    `);
    return "created";
  }

  @Get("/createUser")
  async createUser(@Query("username") username: string) {
    const result = await this.client.execute(
      `INSERT INTO users(name) values(?)`,
      [
        username,
      ],
    );
    console.log(result);
    return result;
  }

  @Get("/updateUser")
  async updateUser(@Query("id") id: number) {
    console.info("Updating user " + id);
    const result = await this.client.execute(
      `update users set ?? = ? where id = ?`,
      [
        "name",
        "MYR",
        id,
      ],
    );
    console.log(result);
    return result;
  }

  @Get('list')
  async list() {
    const result = await this.client.query(`select * from users`);
    console.log(result);
    return result[0];
  }
}
```

More can see the example dir.
