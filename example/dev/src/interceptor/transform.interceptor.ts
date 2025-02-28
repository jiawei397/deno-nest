import { Context, Injectable, Next, type NestInterceptor } from "@nest/core";

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  async intercept(context: Context, next: Next) {
    console.info("TransformInterceptor", "Before ...");
    await next();
    console.info("TransformInterceptor", "After ...");

    // also can change response data or status code
    context.response.status = 400;
    context.response.body = { data: context.response.body, success: true };
  }
}
