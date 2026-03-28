import { Log } from "../util/log";
import { sql } from "drizzle-orm";
export * from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import pg from "postgres";
import { createContext } from "../context";
// import { Resource } from "sst/resource";

const DEFAULT_URL = "postgresql://postgres:password@localhost:5432/postgres";
const log = Log.create({ namespace: "drizzle" });

// const clientMap = new Map<string, pg.Sql>();

function createDb(url: string): PostgresJsDatabase {
  const client = pg(url, { connect_timeout: 10, prepare: false, max: 1, idle_timeout: 20 });
  return drizzle({
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
}

const DatabaseContext = createContext<{ db: PostgresJsDatabase }>();

/** Wrap a request handler — worker calls this once per request */
export function withDatabase<T>(url: string, fn: () => T): T {
  return DatabaseContext.provide({ db: createDb(url) }, fn);
}

let cachedDb: PostgresJsDatabase | undefined;
/** All business logic calls this — no manual init needed */
export function useDatabase(): PostgresJsDatabase {
  try {
    return DatabaseContext.use().db;
  } catch {
    log.warn("no database context, falling back to env");
    if (process.env.NODE_ENV === "test") {
      cachedDb ??= createDb(process.env.DATABASE_URL ?? DEFAULT_URL);
      return cachedDb;
    }
    return createDb(process.env.DATABASE_URL ?? DEFAULT_URL);
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
