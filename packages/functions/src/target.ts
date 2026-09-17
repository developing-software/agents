import type { Hono } from "hono";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { Context } from "@agents/core/context";
import { Database } from "@agents/core/drizzle";
import type { Env } from "./cf";

type App = Pick<Hono, "fetch">;
type Res = Response | Promise<Response>;

/**
 * Cloudflare worker entry — db from the Hyperdrive binding. `extra` sees the request's
 * env, since bindings like `SEND_EMAIL` only exist per request.
 */
export function worker<E extends Env>(
  app: App,
  extra: (env: E) => Context.Provider<Res>[] = () => [],
) {
  return {
    fetch(request: Request, env: E, ctx: ExecutionContext) {
      return Context.withProviders(
        () => app.fetch(request, env, ctx),
        // Fresh pool per request: Workers forbid reusing a socket across them.
        Database.provider(Database.connect(env.HYPERDRIVE.connectionString)),
        ...extra(env),
      );
    },
  };
}

/**
 * Bun server — one pool for the process, unless PG_RELEASE=true cycles it per
 * request: pglite allows a single connection and the other dev processes (console,
 * auth) need it back. `scripts/dev.ts` sets it for the pglite driver.
 */
export function bun(app: App, port: number, ...extra: Context.Provider<Res>[]) {
  const shared = process.env.PG_RELEASE === "true" ? undefined : Database.connect();
  return {
    port,
    fetch: async (req: Request) => {
      const db = shared ?? Database.connect();
      try {
        return await Context.withProviders(() => app.fetch(req), Database.provider(db), ...extra);
      } finally {
        if (!shared) await Database.release(db);
      }
    },
  };
}
