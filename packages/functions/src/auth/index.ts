import { issuer } from "@openauthjs/openauth/issuer";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { subjects } from "./subject";
import { THEME_OPENAUTH } from "@openauthjs/openauth/ui/theme";
import { Account } from "@agents/core/account";
import { Auth } from "@agents/core/auth";
import { Workspace } from "@agents/core/workspace";
import { User } from "@agents/core/user";
import { Actor } from "@agents/core/actor";
import { tokenClient } from "@agents/core/git/provider/github/client";
import { Api } from "@agents/core/api/api";
import { logger } from "hono/logger";
import type { StorageAdapter } from "@openauthjs/openauth/storage/storage";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { Template } from "@agents/core/email/template";

export function createAuth(storage: StorageAdapter = MemoryStorage({})) {
  return issuer({
    subjects,
    storage,
    ttl: { access: 60 * 30 },
    theme: THEME_OPENAUTH,
    providers: {
      github: GithubProvider({
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        scopes: ["user:email", "read:user", "user"],
      }),
      code: CodeProvider(
        CodeUI({
          sendCode: async (claims, code) => {
            if (!claims.email) return;
            await Template.sendLoginCode(claims.email, code);
          },
        }),
      ),
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
    success: async (ctx, response, _req) => {
      let subject: string | undefined;
      let email: string | undefined;

      if (response.provider === "github") {
        const octokit = tokenClient(response.tokenset.access);
        const [{ data: emails }, { data: profile }] = await Promise.all([
          octokit.rest.users.listEmailsForAuthenticatedUser(),
          octokit.rest.users.getAuthenticated(),
        ]);
        const primary = emails.find((e) => e.primary);
        if (!primary) throw new Error("No primary email found for GitHub user");
        if (!primary.verified) throw new Error("Primary email for GitHub user not verified");
        subject = String(profile.id);
        email = primary.email;
      } else if (response.provider === "code") {
        email = response.claims.email;
        subject = email;
      } else throw new Error("Unsupported provider");

      if (!email) throw new Error("No email found");
      if (!subject) throw new Error("No subject found");

      const existing = await Auth.findByProviderOrEmail({
        provider: response.provider,
        subject,
        email,
      });
      const accountID = existing ?? (await Account.create({}));
      await Auth.upsertPair({ accountID, provider: response.provider, subject, email });

      await Actor.provide("account", { accountID, email }, async () => {
        await User.joinInvitedWorkspaces();
        const workspaces = await Workspace.forAccount(accountID);
        if (workspaces.length === 0) await Workspace.create({ name: "Default" });
      });

      return ctx.subject("account", { accountID, email });
    },
  }).use(logger());
}
