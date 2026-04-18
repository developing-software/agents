import { Context } from "@agents/core/context";
import { withDatabase } from "@agents/core/drizzle";
import { Email } from "@agents/core/email";
import { createCloudflareSender } from "@agents/core/email/cloudflare";
import { createAuth } from "@agents/functions/src/auth";
import type { KVNamespace, ExecutionContext } from "@cloudflare/workers-types";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";

interface Env {
  AuthKv: KVNamespace;
  HYPERDRIVE: { connectionString: string };
  SEND_EMAIL: { send(message: Record<string, unknown>): Promise<unknown> };
  [key: string]: unknown;
}

let app: ReturnType<typeof createAuth> | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!app) app = createAuth(CloudflareStorage({ namespace: env.AuthKv }));
    return await Context.withProviders(
      () => app!.fetch(request, env, ctx),
      (fn) => withDatabase(env.HYPERDRIVE.connectionString, fn),
      (fn) => Email.provide(createCloudflareSender(env.SEND_EMAIL), fn),
    );
  },
};
