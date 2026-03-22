// import { withDatabase } from '@agents/core/drizzle/index'
import { createAuth } from "@agents/functions/src/auth";
import type { KVNamespace, ExecutionContext } from "@cloudflare/workers-types";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";

interface Env {
  AuthKv: KVNamespace;
  HYPERDRIVE: { connectionString: string };
  [key: string]: unknown;
}

let app: ReturnType<typeof createAuth> | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!app) app = createAuth(CloudflareStorage({ namespace: env.AuthKv }));
    // return withDatabase(process.env.DATABASE_URL, () =>
    return await app!.fetch(request, env, ctx);
    // )
  },
};
