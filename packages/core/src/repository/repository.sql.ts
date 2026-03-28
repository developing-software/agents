import { pgTable as table, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";
import { githubInstallationTable } from "../github/installation/installation.sql";
import { userTable } from "../user/user.sql";

export const repositoryTable = table(
  "repository",
  {
    ...id,
    ...timestamps,
    userId: ulid("user_id").references(() => userTable.id),
    source: varchar("source", { length: 32 }).notNull(),
    sourceId: varchar("source_id", { length: 255 }).notNull(),
    connectionId: ulid("connection_id").references(() => githubInstallationTable.id).notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    repo: varchar("repo", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 512 }).notNull(),
    defaultBranch: varchar("default_branch", { length: 255 }),
  },
  (t) => [uniqueIndex("repository_source_source_id_key").on(t.source, t.sourceId)],
);
