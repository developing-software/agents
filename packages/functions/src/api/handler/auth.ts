import { authRequired } from "../common";
import { Hono } from "hono";
import { Log } from "@agents/core/util/log";
import { authClient, setTokens, getTokens, deleteTokens } from "../auth";

import { subjects } from "../../auth/subject";

const log = Log.create({ namespace: "api.auth" });

export namespace AuthApi {
  export const route = new Hono()
    .get("/login", async (c) => {
      const { access: accessToken, refresh: refreshToken } = await getTokens(c);
      if (accessToken) {
        const verified = await authClient.verify(subjects, String(accessToken), {
          refresh: String(refreshToken),
        });
        if (!verified.err && verified.tokens) {
          await setTokens(c, verified.tokens.access, verified.tokens.refresh);
          log.info("login", { userId: verified.subject.properties.userID });
          return c.redirect("/");
        }
      }

      const apiUrl = process.env.API_URL ?? new URL(c.req.url).origin;
      const { url } = await authClient.authorize(`${apiUrl}/api/callback`, "code");
      return c.redirect(url);
    })
    .get("/logout", async (c) => {
      deleteTokens(c);
      return c.redirect("/");
    })
    .get("/me", authRequired, async (c) => {
      const { access: accessToken, refresh: refreshToken } = await getTokens(c);
      if (!accessToken) {
        return c.json({ message: "Not authenticated" }, 401);
      }

      const verified = await authClient.verify(subjects, accessToken, {
        refresh: refreshToken ?? undefined,
      });
      if (verified.err || !verified.tokens) {
        return c.json({ message: "Not authenticated" }, 401);
      }

      await setTokens(c, verified.tokens.access, verified.tokens.refresh);

      return c.json({ sub: verified.subject }, 200);
    })
    .get("/callback", async (c) => {
      const { code, error, error_description } = c.req.query();
      const url = new URL(c.req.url);
      if (error || error_description) {
        return c.json(
          {
            type: error || "unknown_error",
            message: error_description || error || "An unknown error occurred",
          },
          400,
        );
      }
      if (!code) {
        return c.json({ message: "Code not provided" }, 400);
      }

      const apiUrl = process.env.API_URL ?? url.origin;
      const exchanged = await authClient.exchange(code, `${apiUrl}/api/callback`);

      if (exchanged.err) {
        log.warn("exchange failed", {
          error: exchanged.err,
          redirectUri: `${apiUrl}/api/callback`,
        });
        return c.json({ message: "Failed to exchange code", error: String(exchanged.err) }, 400);
      }

      await setTokens(c, exchanged.tokens.access, exchanged.tokens.refresh);

      return c.redirect(`${url.origin}/`, 302);
    });
}
