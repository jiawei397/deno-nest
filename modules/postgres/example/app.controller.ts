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
