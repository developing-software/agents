import { type MiddlewareHandler } from "hono";
import { VisibleError, ErrorCodes } from "@agents/core/error";
import { Actor } from "@agents/core/actor";
import { Api } from "@agents/core/api/api";
import { subjects } from "../auth/subject";
import { authClient } from "./auth";

export const auth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("authorization");
  const lang = c.req.header("accept-language") ?? "en";

  if (authHeader) {
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match || !match[1]) {
      throw new VisibleError(
        "authentication",
        ErrorCodes.Authentication.UNAUTHORIZED,
        "Bearer token not found or improperly formatted",
      );
    }
    const bearerToken = match[1];

    if (bearerToken.startsWith("tok_")) {
      const token = await Api.Personal.fromToken(bearerToken);
      if (!token)
        throw new VisibleError(
          "authentication",
          ErrorCodes.Authentication.INVALID_TOKEN,
          "Invalid personal access token",
        );
      return Actor.provide(
        "token",
        { accountID: token.accountID, tokenID: token.id },
        next,
      );
    }

    const result = await authClient.verify(subjects, bearerToken);
    if (result.err) {
      console.error(result.err);
      throw new VisibleError(
        "authentication",
        ErrorCodes.Authentication.INVALID_TOKEN,
        "Invalid bearer token",
      );
    }
    if (result.subject.type === "account") {
      return Actor.provide(
        "account",
        {
          accountID: result.subject.properties.accountID,
          email: result.subject.properties.email,
        },
        next,
      );
    }
  }

  void lang;
  return Actor.provide("public", {}, next);
};
