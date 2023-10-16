import { Context } from "../../../src/interfaces/context.interface.ts";
import { OakContext } from "../deps.ts";
import { NestRequest } from "./request.ts";
import { NestResponse } from "./response.ts";

export const nestContextKey = "NEST_CONTEXT";

export class NestContext implements Context {
  originalContext: OakContext;

  request: NestRequest;
  response: NestResponse;

  constructor(context: OakContext) {
    this.originalContext = context;
    this.request = new NestRequest(context);
    this.response = new NestResponse(context);
  }

  static getInstance(context: OakContext): NestContext {
    context.state;
    const nestContext = context.state[nestContextKey];
    if (nestContext) {
      return nestContext;
    }
    const newContext = new NestContext(context);
    context.state[nestContextKey] = newContext;
    return newContext;
  }

  render() {
    const context = this.originalContext;
    const body = this.response.body;
    if (this.response.status) {
      context.response.status = this.response.status;
    }
    this.response.headers.forEach((val, key) => {
      context.response.headers.set(key, val);
    });

    context.response.body = body;
  }
}