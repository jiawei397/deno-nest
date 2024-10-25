export {
  create,
  getNumericDate,
  type Payload,
  verify,
} from "@zaubrik/djwt";

// Algorithm type not exported: https://jsr.io/@zaubrik/djwt/3.0.2/algorithm.ts
/*
 * JSW §1: Cryptographic algorithms and identifiers for use with this specification
 * are described in the separate JSON Web Algorithms (JWA) specification:
 * https://www.rfc-editor.org/rfc/rfc7518
 */
export type Algorithm =
  | "HS256"
  | "HS384"
  | "HS512"
  | "PS256"
  | "PS384"
  | "PS512"
  | "RS256"
  | "RS384"
  | "RS512"
  | "ES256"
  | "ES384"
  // https://github.com/denoland/deno/blob/main/ext/crypto/00_crypto.js
  // | "ES512" //is not yet supported.
  | "none";
