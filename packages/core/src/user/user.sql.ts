import { snakeCase, text, uniqueIndex } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";
import type { Permission } from "../permission";

/**
 * A workspace's people and Apps. A person's id is their `central.account` id; an App has no
 * account, so its id is its own. Tenant tables join this, never `central`.
 */
export const UserTable = snakeCase.table(
  "user",
  {
    id: id(),
    ...timestamps,
    name: text().notNull(),
    email: text().notNull(),
    image: text(),
    // `$type` narrows `$inferSelect` to the role union, so the actor boundary needs no cast.
    role: text().$type<Permission.Role>().notNull().default("member"),
    // A `system` user is an App: nobody logs in as it — CI, an integration — acting through keys.
    kind: text({ enum: ["human", "system"] })
      .notNull()
      .default("human"),
    // Set for Apps: the person answerable for it. An App never outlives or outranks them.
    ownerID: ulid(),
  },
  (table) => [uniqueIndex("user_email").on(table.email)],
);
