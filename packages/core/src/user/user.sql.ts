import {
  index,
  integer,
  json,
  pgTable as table,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { id, timestamp, timestamps, ulid } from "../drizzle/types";
import { accountTable } from "../account/account.sql";
import { workspaceTable } from "../workspace/workspace.sql";
import { z } from "zod";

export const UserFlags = z.object({
  notificationChannel: z.string().optional(),
});
export type UserFlags = z.infer<typeof UserFlags>;

export const USER_ROLES = ["admin", "member"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const userTable = table(
  "user",
  {
    ...id,
    ...timestamps,
    workspaceID: ulid("workspace_id")
      .references(() => workspaceTable.id, { onDelete: "cascade" })
      .notNull(),
    accountID: ulid("account_id").references(() => accountTable.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    role: text("role").$type<UserRole>().notNull().default("member"),
    timeSeen: timestamp("time_seen"),
    monthlyLimit: integer("monthly_limit"),
    flags: json("flags").$type<UserFlags>().default({}),
  },
  (t) => [
    uniqueIndex("user_workspace_account_key").on(t.workspaceID, t.accountID),
    uniqueIndex("user_workspace_email_key").on(t.workspaceID, t.email),
    index("user_account_id_idx").on(t.accountID),
    index("user_email_idx").on(t.email),
  ],
);
