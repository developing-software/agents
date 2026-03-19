import { pgTable as table, varchar } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";
import { userTable } from "../user/user.sql";

export const apiClientTable = table("api_client", {
  ...id,
  ...timestamps,
  name: varchar("name", { length: 255 }).notNull(),
  secret: varchar("secret", { length: 255 }).notNull(),
  redirectURI: varchar("redirect", { length: 255 }).notNull(),
  userID: ulid("user_id")
    .references(() => userTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
});

export const apiPersonalTokenTable = table("api_personal_token", {
  ...id,
  ...timestamps,
  token: varchar("token", { length: 255 }).notNull(),
  userID: ulid("user_id")
    .references(() => userTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
});
