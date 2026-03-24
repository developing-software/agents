import { Log } from "../util/log";
import { sql } from "drizzle-orm";
export * from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import pg from "postgres";
import { createContext } from "../context";

const DEFAULT_URL = "postgresql://postgres:password@localhost:5432/postgres";
const log = Log.create({ namespace: "drizzle" });

const clientCache = new Map<string, PostgresJsDatabase>();

function createDb(url: string): PostgresJsDatabase {
  if (clientCache.has(url)) return clientCache.get(url)!;
  const client = pg(url, { connect_timeout: 10 });
  const database = drizzle({
    client,
    logger:
      process.env.DRIZZLE_LOG === "true"
        ? {
            logQuery(query, params) {
              log.info("query", { query });
              log.info("params", { params });
            },
          }
        : undefined,
  });
  clientCache.set(url, database);
  return database;
}

const DatabaseContext = createContext<{ db: PostgresJsDatabase }>();

/** Wrap a request handler — worker calls this once per request */
export function withDatabase<T>(url: string, fn: () => T): T {
  return DatabaseContext.provide({ db: createDb(url) }, fn);
}

/** All business logic calls this — no manual init needed */
export function useDatabase(): PostgresJsDatabase {
  try {
    return DatabaseContext.use().db;
  } catch {
    // Fallback for non-worker environments (dev, scripts, tests)
    log.warn("no database context, falling back to env");
    return createDb(process.env.DATABASE_URL || DEFAULT_URL);
  }
}

export async function healthcheck(): Promise<{ status: "ok" | "degraded"; message: string }> {
  try {
    await useDatabase().execute(sql`SELECT 1`);
    return { status: "ok", message: "ok" };
  } catch (err) {
    log.error(err instanceof Error ? err : new Error(String(err)));
    return {
      status: "degraded",
      message: err instanceof Error ? err.message : "unreachable",
    };
  }
}
