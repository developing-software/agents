import { boolean, jsonb, pgTable as table, unique, varchar } from "drizzle-orm/pg-core";
import { accountTable } from "../account/account.sql";
import { id, timestamp, timestamps, ulid } from "../drizzle/types";

export const installationsTable = table(
  "installations",
  {
    ...id,
    ...timestamps,
    accountId: ulid("account_id").references(() => accountTable.id),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    providerAccountLogin: varchar("provider_account_login", { length: 255 }).notNull(),
    installationRef: varchar("installation_ref", { length: 255 }),
    accountType: varchar("account_type", { length: 32 }).notNull(),
    active: boolean("active").notNull().default(true),
    suspendedAt: timestamp("suspended_at"),
    meta: jsonb("meta"),
  },
  (t) => [unique("installations_provider_provider_account_id_key").on(t.provider, t.providerAccountId)],
);
