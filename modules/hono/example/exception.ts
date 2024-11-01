// deno-lint-ignore-file no-explicit-any
import {
  Catch,
  type Context,
  type ExceptionFilter,
  HttpException,
} from "@nest/core";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, context: Context) {
    console.log("httpException-----", exception);
    context.response.body = {
      statusCode: exception.status,
      timestamp: new Date().toISOString(),
      path: context.request.url,
      type: "HttpExceptionFilter",
      message: exception.message,
    };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, context: Context) {
    console.log("AllExceptionsFilter-----");
    context.response.body = {
      statusCode: (exception as any).status,
      timestamp: new Date().toISOString(),
      path: context.request.url,
      type: "AllExceptionsFilter",
      error: (exception as Error).message || exception,
    };
  }
}
