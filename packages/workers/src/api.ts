import { withDatabase } from "@agents/core/drizzle";
import { routes } from "@agents/functions/src/api/routes";
import type { ExecutionContext, R2Bucket } from "@cloudflare/workers-types";
// import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { Hono } from "hono";

interface Env {
  HYPERDRIVE: { connectionString: string };
  Artifacts: R2Bucket;
  [key: string]: unknown;
}

const app = new Hono().route("/api", routes);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return await withDatabase(env.HYPERDRIVE.connectionString, () => app!.fetch(request, env, ctx));
  },
};
