import { boolean, jsonb, text, uniqueIndex } from "drizzle-orm/pg-core";
import { central, id, timestamps } from "../drizzle/types";
import { DEFAULTS, type Prefs } from "./prefs";

// App-wide: a `superadmin` operates the whole app (the workspace registry). Workspace roles live on `user`.
export const AccountRoles = ["user", "superadmin"] as const;
export type AccountRole = (typeof AccountRoles)[number];

/** A login. Its id is also its `user` id in every workspace it joins. */
export const AccountTable = central.table(
  "account",
  {
    id: id(),
    ...timestamps,
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: text().$type<AccountRole>().notNull().default("user"),
    // Defaulting to the whole object, not `{}`, backfills existing rows in the same
    // ALTER statement — so reads never have to cope with a half-empty blob.
    prefs: jsonb().$type<Prefs>().notNull().default(DEFAULTS),
  },
  (table) => [uniqueIndex("account_email").on(table.email)],
);
