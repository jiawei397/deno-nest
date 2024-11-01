import {
  BadGatewayException,
  type Context,
  Injectable,
  type NestInterceptor,
  Next,
} from "@nest/core";
import { RoleService } from "../user/services/role.service.ts";

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
  constructor(
    private readonly roleService: RoleService,
  ) {
  }

  // deno-lint-ignore no-unused-vars
  async intercept(context: Context, next: Next) {
    try {
      // console.log(`roleService`, this.roleService.getRole());
      console.log("ErrorsInterceptor", "Before ...");
      await next();
    } catch (err) {
      console.log("ErrorsInterceptor", "After ..."); // If want to throw error, should throw it here.
      throw new BadGatewayException(err);
      // context.response.body = {
      //   name: "error interceptor",
      // };
    }
  }
}
