import { sql } from "drizzle-orm";
export * from "drizzle-orm";
import {
  PgAsyncTransaction,
  type PgQueryResultHKT,
  type PgTransactionConfig,
} from "drizzle-orm/pg-core";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm/relations";
import pg from "postgres";
import { Context } from "../context";
import { Log } from "../util/log";

const DEFAULT_URL = "postgresql://postgres:password@localhost:5432/postgres";
const log = Log.create({ namespace: "drizzle" });

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

const DatabaseContext = Context.create<{ db: PostgresJsDatabase }>();
let cachedDb: PostgresJsDatabase | undefined;

function getDatabase(): PostgresJsDatabase {
  try {
    return DatabaseContext.use().db;
  } catch (err) {
    if (!(err instanceof Context.NotFound)) {
      throw err;
    }

    log.warn("no database context, falling back to env");
    if (process.env.NODE_ENV === "test") {
      cachedDb ??= createDb(process.env.DATABASE_URL ?? DEFAULT_URL);
      return cachedDb;
    }
    return createDb(process.env.DATABASE_URL ?? DEFAULT_URL);
  }
}

export namespace Database {
  export type Transaction = PgAsyncTransaction<
    PgQueryResultHKT,
    Record<string, never>,
    ExtractTablesWithRelations<Record<any, never>, Record<any, never>>
  >;

  export type TxOrDb = Transaction | PostgresJsDatabase;

  const TransactionContext = Context.create<{
    tx: Transaction;
    effects: (() => void | Promise<void>)[];
  }>();

  function current() {
    try {
      return TransactionContext.use();
    } catch (err) {
      if (err instanceof Context.NotFound) {
        return;
      }
      throw err;
    }
  }

  export async function use<T>(callback: (tx: TxOrDb) => Promise<T>): Promise<T> {
    const existing = current();
    if (existing) {
      return callback(existing.tx);
    }
    return callback(getDatabase());
  }

  export async function effect(effect: () => any | Promise<any>): Promise<void> {
    const existing = current();
    if (existing) {
      existing.effects.push(effect);
      return;
    }
    await effect();
  }

  export async function transaction<T>(
    callback: (tx: Transaction) => Promise<T>,
    isolationLevel?: PgTransactionConfig["isolationLevel"],
  ): Promise<T> {
    const existing = current();
    if (existing) {
      return callback(existing.tx);
    }

    const effects: (() => void | Promise<void>)[] = [];
    const result = await getDatabase().transaction(
      async (tx) => TransactionContext.provide({ tx, effects }, () => callback(tx)),
      {
        isolationLevel: isolationLevel || "read committed",
      },
    );
    await Promise.all(effects.map((effect) => effect()));
    return result as T;
  }

  export async function fn<Input, T>(callback: (input: Input, trx: TxOrDb) => Promise<T>) {
    return (input: Input) => use(async (tx) => callback(input, tx));
  }
}

/** Wrap a request handler — worker calls this once per request */
export function withDatabase<T>(url: string, fn: () => T): T {
  return DatabaseContext.provide({ db: createDb(url) }, fn);
}

export async function healthcheck(): Promise<{ status: "ok" | "degraded"; message: string }> {
  try {
    await Database.use((tx) => tx.execute(sql`SELECT 1`));
    return { status: "ok", message: "ok" };
  } catch (err) {
    log.error(err instanceof Error ? err : new Error(String(err)));
    return {
      status: "degraded",
      message: err instanceof Error ? err.message : "unreachable",
    };
  }
}
