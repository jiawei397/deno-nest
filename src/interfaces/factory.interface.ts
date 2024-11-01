// deno-lint-ignore-file no-explicit-any ban-types ban-types no-explicit-any
import type { LoggerService } from "./log.interface.ts";
import type { RouterOptions } from "./route.interface.ts";

export interface InjectedData {
  fn: Function;
  params: any[];

  scope?: any;
}

export type InjectParams = (() => any) | string | symbol | InjectedData;

/**
 * Interface describing options for serving static assets.
 */
export interface StaticOptions {
  /**
   * The root directory from which to serve static assets.
   */
  baseDir: string;
  /**
   * Creates a virtual path prefix
   */
  prefix?: string;
}

export type FactoryCreateOptions = RouterOptions & {
  cache?: Map<any, any>;
  logger?: LoggerService | false;
};

export type FactoryCaches = Map<any, any>;
