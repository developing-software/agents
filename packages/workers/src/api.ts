import { Context } from "@agents/core/context";
import { Database } from "@agents/core/drizzle";
import { Email } from "@agents/core/email";
import { createCloudflareSender } from "@agents/core/email/cloudflare";
import { routes } from "@agents/functions/src/api/routes";
import type { ExecutionContext, R2Bucket } from "@cloudflare/workers-types";
// import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { Hono } from "hono";

interface Env {
  HYPERDRIVE: { connectionString: string };
  Artifacts: R2Bucket;
  SEND_EMAIL: { send(message: Record<string, unknown>): Promise<unknown> };
  [key: string]: unknown;
}

const app = new Hono().route("/api", routes);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return await Context.withProviders(
      () => app!.fetch(request, env, ctx),
      (fn) => Database.provide(env.HYPERDRIVE.connectionString, fn),
      (fn) => Email.provide(createCloudflareSender(env.SEND_EMAIL), fn),
    );
  },
};
