import {
  REDIRECT_BACK,
  STATUS_CODE,
  STATUS_TEXT,
  type StatusCode,
} from "@nest/core";
import type { RedirectStatusCode, Response, StatusText } from "@nest/core";
import { type HonoContext, HonoResponse } from "../deps.ts";
import type { NestCookies } from "./cookies.ts";

export class NestResponse implements Response {
  body: string | object | number | boolean | null;
  headers: Headers = new Headers();
  status: StatusCode;
  originalContext: HonoContext;

  constructor(context: HonoContext, public cookies: NestCookies) {
    this.originalContext = context;
    this.status = STATUS_CODE.OK;
  }

  redirect(
    url: string | typeof REDIRECT_BACK,
    status?: RedirectStatusCode,
  ): void {
    let location: string;
    if (url === REDIRECT_BACK) {
      const url = this.originalContext.req.header("Referer");
      if (!url) {
        const u = new URL(this.originalContext.req.url);
        location = u.origin;
      } else {
        location = url;
      }
    } else {
      location = url;
    }
    const context = this.originalContext;
    const statusCode = status || 302;
    this.status = statusCode;
    context.status(statusCode);
    this.body = context.redirect(location, statusCode);
  }

  get statusText(): StatusText {
    return STATUS_TEXT[this.status];
  }

  getOriginalContext<T>(): T {
    return this.originalContext as T;
  }

  // deno-lint-ignore require-await
  async render(): Promise<HonoResponse> {
    const body = this.body;
    if (body && body instanceof HonoResponse) {
      return body;
    }
    const context = this.originalContext;
    if (this.status) {
      context.status(this.status);
    }
    this.headers.forEach((val, key) => {
      context.header(key, val);
    });

    // deal with body
    if(body === null || body === undefined ) {
      return context.body(null);
    }
    if (
      body instanceof ReadableStream ||
      body instanceof ArrayBuffer ||
      body instanceof Uint8Array
    ) { 
      return context.body(body);
    }

    const contextType = this.headers.get("content-type");
    if (
      (contextType && contextType.includes("application/json")) ||
      typeof body === "object" || typeof body === "number" ||
      typeof body === "boolean"
    ) {
      // deno-lint-ignore no-explicit-any
      return context.json(body as any);
    }
    if (contextType && contextType.includes("text/plain")) {
      return context.text(body);
    }
    return context.html(body);
  }
}
