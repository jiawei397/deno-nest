// deno-lint-ignore-file no-explicit-any
import type { Request } from "@nest/core";
import type { OakContext, OakRequest } from "../deps.ts";
import type { NestCookies } from "./cookies.ts";

export class NestRequest implements Request {
  originalRequest: OakRequest;
  originalContext: OakContext;
  startTime: number = Date.now();

  states: Record<string, any> = {};
  cookies: NestCookies;

  constructor(context: OakContext, cookies: NestCookies) {
    this.originalContext = context;
    this.originalRequest = context.request;
    this.cookies = cookies;
  }

  getOriginalRequest<T>(): T {
    return this.originalRequest as T;
  }

  get url(): string {
    return this.originalRequest.url.href;
  }

  get method(): string {
    return this.originalRequest.method;
  }

  async json(): Promise<any> {
    const body = this.originalRequest.body;
    const json = await body.json();
    return json;
  }

  text(): Promise<string> {
    const body = this.originalRequest.body;
    return body.text();
  }

  async formData(): Promise<FormData> {
    const contentType = this.originalRequest.headers.get("content-type");
    if (
      !contentType ||
      (!contentType.includes("multipart/form-data") &&
        !contentType.includes("application/x-www-form-urlencoded"))
    ) {
      throw new Error("Invalid content type");
    }
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const body = this.originalRequest.body;
      const result = await body.form();
      const form = new FormData();
      for (const [key, value] of result.entries()) {
        form.set(key, value);
      }
      return form;
    }
    const body = this.originalRequest.body;
    const result = await body.formData();
    return result;
    //
    // content:  undefined
    // contentType: 'application/octet-stream'
    // filename: '/var/folders/sq/0jfgh1js6cs8_31df82hx3jw0000gn/T/db9658e7/9b58f3ae6093b7f1a5289a9eaf1727a6e143c693.bin'
    // name: 'c'
    // originalName: 'hello.txt'
  }

  /**
   * Get all headers
   */
  headers(): Headers {
    return this.originalRequest.headers;
  }

  /**
   * Get a specific header value
   */
  header(name: string): string | undefined {
    return this.originalRequest.headers.get(name) || undefined;
  }

  /**
   * Get all path params as a key-value object
   */
  params(): Record<string, string> {
    return (this.originalContext as any).params;
  }

  /**
   * Get a specific param value. such as /user/:id
   */
  param(name: string): string | undefined {
    return (this.originalContext as any).params[name];
  }

  /**
   * Get multiple query param values
   */
  queries(name: string): string[] {
    const search = this.originalRequest.url.searchParams;
    return search.getAll(name);
  }

  /**
   * Get a specific query param value
   */
  query(name: string): string | undefined {
    return this.originalRequest.url.searchParams.get(name) || undefined;
  }
}
