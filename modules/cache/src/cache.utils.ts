import { encodeHex } from "@std/encoding";
import { md5 as md } from "@takker/md5";

export function md5(str: string): string {
  return encodeHex(md(str));
}