import { index, pgTable as table, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";
import { accountTable } from "../account/account.sql";

export const AUTH_PROVIDERS = ["github", "google", "email", "code"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export const authTable = table(
  "auth",
  {
    ...id,
    ...timestamps,
    provider: text("provider").$type<AuthProvider>().notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    accountID: ulid("account_id")
      .references(() => accountTable.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => [
    uniqueIndex("auth_provider_subject_key").on(t.provider, t.subject),
    index("auth_account_id_idx").on(t.accountID),
  ],
);
