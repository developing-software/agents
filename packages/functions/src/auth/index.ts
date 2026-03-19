import { issuer } from "@openauthjs/openauth/issuer";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { subjects } from "./subject";
import { THEME_OPENAUTH } from "@openauthjs/openauth/ui/theme";
import { User } from "@agents/core/user/index";
import { GitHub } from "@agents/core/github";
import { Api } from "@agents/core/api/api";
import { logger } from "hono/logger";
import type { StorageAdapter } from "@openauthjs/openauth/storage/storage";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";

export function createAuth(storage: StorageAdapter = MemoryStorage({})) {
  return issuer({
    subjects,
    storage,
    ttl: {
      access: 60 * 30,
    },
    theme: THEME_OPENAUTH,
    providers: {
      github: GithubProvider({
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        scopes: ["email", "profile"],
      }),
    },
    allow: async (input, _req) => {
      if (process.env.SST_DEV) return true;
      const url = new URL(input.redirectURI);
      const hostname = url.hostname;
      if (hostname.endsWith("developing.company")) return true;
      if (hostname.endsWith(".workers.dev")) return true;
      if (hostname === "localhost") return true;
      if (hostname.endsWith(".localhost")) return true;
      try {
        if (
          await Api.Client.verifyRedirect({
            id: input.clientID,
            redirectURI: url.origin + url.pathname,
          })
        )
          return true;
      } catch (err) {
        console.error("verifyRedirect failed:", err);
      }
      return false;
    },
    success: async (ctx, value, _req) => {
      const octokit = GitHub.fromToken(value.tokenset.access);
      const [{ data: emails }, { data: profile }] = await Promise.all([
        octokit.rest.users.listEmailsForAuthenticatedUser(),
        octokit.rest.users.getAuthenticated(),
      ]);

      const primary = emails.find((e) => e.primary);
      if (!primary?.verified) throw new Error("Email not verified");

      const { email } = primary;
      const username = profile.login;
      const avatarUrl = profile.avatar_url;

      const matching = await User.fromEmail(email);

      if (matching.length === 0) {
        const id = await User.create({ email, username, avatarUrl });
        return ctx.subject("user", { userID: id });
      }

      if (matching.length === 1) {
        const user = matching[0]!;
        if (user.username !== username || user.avatarUrl !== avatarUrl)
          await User.update({ id: user.id, username, avatarUrl });
        return ctx.subject("user", { userID: user.id });
      }

      const id = await User.merge(matching.map((x) => x.id));
      if (id) await User.update({ id, username, avatarUrl });
      return ctx.subject("user", { userID: id! });
    },
  }).use(logger());
}
