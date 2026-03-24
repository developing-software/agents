import {
  // PgTransaction,
  PgAsyncTransaction,
  type PgTransactionConfig,
  type PgQueryResultHKT,
} from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm/relations";
import { useDatabase } from ".";
import { createContext } from "../context";

export type Transaction = PgAsyncTransaction<
  PgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<any, never>, Record<any, never>>
>;

type TxOrDb = Transaction | ReturnType<typeof useDatabase>;

const TransactionContext = createContext<{
  tx: Transaction;
  effects: (() => void | Promise<void>)[];
}>();

export async function useTransaction<T>(callback: (trx: TxOrDb) => Promise<T>) {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    return callback(useDatabase());
  }
}

export async function afterTx(effect: () => any | Promise<any>) {
  try {
    const { effects } = TransactionContext.use();
    effects.push(effect);
  } catch {
    await effect();
  }
}

export async function createTransaction<T>(
  callback: (tx: Transaction) => Promise<T>,
  isolationLevel?: PgTransactionConfig["isolationLevel"],
): Promise<T> {
  try {
    const { tx } = TransactionContext.use();
    return callback(tx);
  } catch {
    const effects: (() => void | Promise<void>)[] = [];
    const result = await useDatabase().transaction(
      async (tx) => {
        return TransactionContext.provide({ tx, effects }, () => callback(tx));
      },
      {
        isolationLevel: isolationLevel || "read committed",
      },
    );
    await Promise.all(effects.map((x) => x()));
    return result as T;
  }
}
