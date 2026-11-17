import type { MiddlewareHandler } from "hono";
import { Context } from "@agents/core/context";

/** Runs each request inside the given contexts, e.g. `providers(Database.provider(db))`. */
export function providers(...list: Context.Provider<Promise<void>>[]): MiddlewareHandler {
  return (_, next) => Context.withProviders(next, ...list);
}
