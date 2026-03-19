// import "zod-openapi/extend";
import { issuer } from "@openauthjs/openauth/issuer";
import { PasswordProvider } from "@openauthjs/openauth/provider/password";
// import type { Provider } from "@openauthjs/openauth/provider/provider";
import { PasswordUI } from "@openauthjs/openauth/ui/password";
import { CodeProvider } from "@openauthjs/openauth/provider/code";
import { CodeUI } from "@openauthjs/openauth/ui/code";
import { Select } from "@openauthjs/openauth/ui/select";
// import { TwitchProvider } from "@openauthjs/openauth/provider/twitch";
import { GithubProvider } from "@openauthjs/openauth/provider/github";
import { subjects } from "./subject";
import { THEME_OPENAUTH } from "@openauthjs/openauth/ui/theme";
// import { Resource } from "sst";
// import { handle } from "hono/aws-lambda";
import { User } from "@agents/core/user/index";
import { Api } from "@agents/core/api/api";
// import { Email } from "@agents/core/email/index";
import { logger } from "hono/logger";
// import type { KVNamespace } from '@cloudflare/workers-types'
import z from "zod";
import { Template } from "@agents/core/email/template";
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
    select: Select(),
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
      // const url = new URL()

      let email = undefined as string | undefined;

      // if (value.provider === "code") {
      //   email = value.claims.email;
      // }

      // if (value.provider === "password") {
      //   email = value.email;
      // }
      if (value.provider === "github") {
        const access = value.tokenset.access;
        const response = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `token ${access}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        const emails = (await response.json()) as any[];
        const primary = emails.find((email: any) => email.primary);
        if (!primary.verified) {
          throw new Error("Email not verified");
        }
        email = primary.email;
      }

      if (email) {
        const matching = await User.fromEmail(email);
        if (matching.length === 0) {
          const id = await User.create({
            email,
          });
          return ctx.subject("user", {
            userID: id,
          });
        }
        if (matching.length === 1) {
          return ctx.subject("user", {
            userID: matching[0]!.id,
          });
        }
        if (matching.length > 1) {
          const id = await User.merge(matching.map((x) => x.id));
          return ctx.subject("user", {
            userID: id!,
          });
        }
      }

      return new Response("something went wrong", { status: 500 });
    },
  }).use(logger());
}
