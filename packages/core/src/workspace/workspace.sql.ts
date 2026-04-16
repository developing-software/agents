import { pgTable as table, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { id, timestamps } from "../drizzle/types";

export const workspaceTable = table(
  "workspace",
  {
    ...id,
    ...timestamps,
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }),
  },
  (t) => [uniqueIndex("workspace_slug_key").on(t.slug)],
);
