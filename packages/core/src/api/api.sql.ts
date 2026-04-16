import { index, pgTable as table, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { id, timestamp, timestamps, ulid } from "../drizzle/types";
import { accountTable } from "../account/account.sql";
import { userTable } from "../user/user.sql";

export const apiClientTable = table("api_client", {
  ...id,
  ...timestamps,
  name: varchar("name", { length: 255 }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  redirectURI: varchar("redirect", { length: 255 }).notNull(),
  accountID: ulid("account_id")
    .references(() => accountTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
});

export const apiPersonalTokenTable = table("api_personal_token", {
  ...id,
  ...timestamps,
  userID: ulid("user_id")
    .references(() => userTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull(),
  prefix: varchar("prefix", { length: 32 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
}, (t) => [
  index("api_personal_token_user_idx").on(t.userID),
  uniqueIndex("api_personal_token_token_key").on(t.token),
]);
