// deno-lint-ignore-file require-await
import { CanActivate, Context } from "@nest/core";

export class AuthGuard3 implements CanActivate {
  async canActivate(_context: Context): Promise<boolean> {
    console.log("--AuthGuard3---");
    this.test();
    // throw new ForbiddenException("this is AuthGuard3 error message");
    return true;
    // return false;
  }

  test() {
    console.log("---test");
  }
}

function SSOGuard2() {
  return class Guard implements CanActivate {
    async canActivate(_context: Context) {
      return true;
    }
  };
}

export const SSOGuard = SSOGuard2();
