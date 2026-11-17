import { index, text, uniqueIndex } from "drizzle-orm/pg-core";
import { central, id, timestamps, ulid } from "../../drizzle/types";
import type { Permission } from "../../permission";

/** A tenant: its rows live in their own Postgres schema, named by `schema`. */
export const WorkspaceTable = central.table(
  "workspace",
  {
    id: id(),
    ...timestamps,
    slug: text().notNull(),
    name: text().notNull(),
    schema: text().notNull(),
    // `pending` until the setup job has migrated the schema and seated the owner.
    status: text().$type<"pending" | "ready">().notNull().default("pending"),
  },
  (table) => [
    uniqueIndex("workspace_slug").on(table.slug),
    uniqueIndex("workspace_schema").on(table.schema),
  ],
);

/** Who can see a workspace, so listing one's workspaces never opens each. Roles live in its `member`. */
export const AccessTable = central.table(
  "access",
  {
    userID: ulid().notNull(),
    workspaceID: ulid().notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("access_user_workspace").on(table.userID, table.workspaceID)],
);

/**
 * A seat offered to an address that may have no account yet. Central, so a login finds every
 * workspace inviting it in one read; claiming it seats the account and deletes the row.
 */
export const InviteTable = central.table(
  "invite",
  {
    id: id(),
    ...timestamps,
    workspaceID: ulid().notNull(),
    email: text().notNull(),
    role: text().$type<Permission.Role>().notNull().default("member"),
    invitedBy: ulid().notNull(),
  },
  (table) => [
    uniqueIndex("invite_workspace_email").on(table.workspaceID, table.email),
    index("invite_email").on(table.email),
  ],
);
