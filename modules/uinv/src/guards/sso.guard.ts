// deno-lint-ignore-file no-explicit-any
import { ajax } from "../tools/ajax.ts";
import { CanActivate, Context, UnauthorizedException } from "../../deps.ts";
import { Logger, SSOUserInfo } from "../types.ts";
import { stringify } from "../tools/utils.ts";
import { Injectable, Reflector, SetMetadata } from "../../../../mod.ts";

const SSO_STATUS_META_KEY = "meta:sso:status";

export const Public = () => SetMetadata(SSO_STATUS_META_KEY, "true");

/**
 * sso守卫
 */
export function SSOGuard(options: {
  logger?: Logger;
  ssoApi?: string;
  ssoUserAgent?: string;
  ssoUserInfoUrl?: string;
  referer?: string;
  cacheTimeout?: number;
  ssoAllowAllUsers?: boolean;
} = {}) {
  const {
    logger = console,
    ssoApi,
    ssoUserAgent,
    ssoAllowAllUsers,
    ssoUserInfoUrl = "/user/userinfo",
    referer,
    cacheTimeout = 60 * 60 * 1000,
  } = options;

  @Injectable()
  class Guard implements CanActivate {
    constructor(
      private readonly reflector: Reflector,
    ) {}

    async canActivate(context: Context) {
      const b = await this.validateRequest(context);
      if (!b) {
        throw new UnauthorizedException("Unauthorized");
      }
      return b;
    }

    getSimpleUserInfo(user: SSOUserInfo) {
      return {
        id: user.user_id,
        username: user.username,
      };
    }

    private async getSSO(request: Request) {
      const headers = request.headers;
      const userInfo = await ajax.get<SSOUserInfo>(ssoUserInfoUrl, null, {
        baseURL: ssoApi || Deno.env.get("ssoApi"),
        headers: {
          cookie: headers.get("cookie") || "",
          "user-agent": headers.get("user-agent") || ssoUserAgent ||
            Deno.env.get("ssoUserAgent") || "",
          referer: headers.get("referer") || referer || "",
        },
        cacheTimeout,
      });
      userInfo.id = userInfo.user_id + "";
      return userInfo;
    }

    async validateRequest(context: Context) {
      try {
        const request: any = context.request;
        if (request.userInfo) {
          logger.debug(
            "SSOGuard",
            `上一个guard中已经有用户信息：${
              stringify(this.getSimpleUserInfo(request.userInfo))
            }`,
          );
          return true;
        }
        const userInfo = await this.getSSO(request);
        const simpleInfo = this.getSimpleUserInfo(userInfo);
        if (!userInfo.internal) { // 外部用户
          if (
            !ssoAllowAllUsers && Deno.env.get("ssoAllowAllUsers") !== "true"
          ) {
            const isAllow = this.reflector.get<"true">(
              SSO_STATUS_META_KEY,
              context,
            ) === "true"; // 在不允许所有用户的情况下，要想跳过验证，只有使用Public方法
            if (!isAllow) {
              logger.error("SSOGuard", `外部用户校验信息未通过：${stringify(simpleInfo)}`);
              return false;
            }
          }
        }
        logger.debug("SSOGuard", `校验通过，得到用户信息为：${stringify(simpleInfo)}`);
        request.userInfo = userInfo;
        return true;
      } catch (e) {
        logger.error("SSOGuard", `校验信息未通过，原因是：${e.message || e}`);
        return false;
      }
    }
  }

  return Guard;
}