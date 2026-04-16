import { pgTable as table, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { accountTable } from "../account/account.sql";
import { id, timestamps, ulid } from "../drizzle/types";
import { installationsTable } from "../git/installation.sql";

export const repositoryTable = table(
  "repository",
  {
    ...id,
    ...timestamps,
    accountId: ulid("account_id").references(() => accountTable.id),
    source: varchar("source", { length: 32 }).notNull(),
    sourceId: varchar("source_id", { length: 255 }).notNull(),
    installationId: ulid("installation_id")
      .references(() => installationsTable.id)
      .notNull(),
    owner: varchar("owner", { length: 255 }).notNull(),
    repo: varchar("repo", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 512 }).notNull(),
    defaultBranch: varchar("default_branch", { length: 255 }),
  },
  (t) => [uniqueIndex("repository_source_source_id_key").on(t.source, t.sourceId)],
);
