import type { NestMiddleware } from "../deps.ts";
import type { Logger } from "./types.ts";

/**
 * The difference between LogInterceptor and LogMiddleware is that the latter can capture 404 errors, and it include the guard time.
 */
export function getLogMiddleware(options?: {
  logger?: Logger;
  logLevel?: "info" | "debug";
  isHeaderResponseTime?: boolean;
}): NestMiddleware {
  const logger = options?.logger ?? console;
  const logLevel = options?.logLevel ?? "info";

  const middleware: NestMiddleware = async (req, res, next) => {
    const start = Date.now();
    await next();
    const time = Date.now() - start;
    const msg = `${req.method} ${req.url} [${res.status}] - ${time}ms`;
    logger[logLevel](msg);
    if (options?.isHeaderResponseTime) {
      res.headers.set("X-Response-Time", `${time}ms`);
      return res.render();
    }
  };
  return middleware;
}
