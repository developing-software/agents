import { type MiddlewareHandler } from "hono";
import { VisibleError, ErrorCodes } from "@agents/core/error";
import { Actor } from "@agents/core/actor";
import { Api } from "@agents/core/api/api";
import { subjects } from "../auth/subject";
import { authClient, getTokens, setTokens } from "./auth";

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

    if (bearerToken?.startsWith("tok_")) {
      const token = await Api.Personal.fromToken(bearerToken);
      if (!token)
        throw new VisibleError(
          "authentication",
          ErrorCodes.Authentication.INVALID_TOKEN,
          "Invalid personal access token",
        );
      return Actor.provide(
        "token",
        {
          userID: token.userID,
          tokenID: token.id,
        },
        next,
      );
    }

    const result = await authClient.verify(subjects, bearerToken);
    if (result.err)
      throw new VisibleError(
        "authentication",
        ErrorCodes.Authentication.INVALID_TOKEN,
        "Invalid bearer token",
      );
    if (result.subject.type === "user") {
      return Actor.provide(
        "user",
        {
          userID: result.subject.properties.userID,
          clientID: result.aud,
        },
        next,
      );
    }
  }

  const { access: cookieAccessToken, refresh: cookieRefreshToken } = await getTokens(c);

  if (cookieAccessToken) {
    const verified = await authClient.verify(subjects, cookieAccessToken, {
      refresh: cookieRefreshToken ?? undefined,
    });

    if (!verified.err) {
      // Persist refreshed tokens back to cookies so subsequent requests
      // don't need to refresh again
      if (verified.tokens) {
        await setTokens(c, verified.tokens.access, verified.tokens.refresh);
      }

      if (verified.subject.type === "user") {
        return Actor.provide(
          "user",
          {
            userID: verified.subject.properties.userID,
            clientID: verified.aud,
          },
          next,
        );
      }
    }
  }

  return Actor.provide("public", { lang }, next);
};
