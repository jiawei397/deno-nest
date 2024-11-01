import { Controller, Get } from "@nest/core";
import { ConfigService } from "./config/config.service.ts";

@Controller("")
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get("/")
  hello() {
    return this.configService.get("hostname");
  }
}
