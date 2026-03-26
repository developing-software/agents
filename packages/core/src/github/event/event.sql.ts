import { integer, json, pgTable as table, varchar } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../../drizzle/types";
import { githubRepoTable } from "../repo/repo.sql";

export const githubEventTable = table("github_event", {
  ...id,
  ...timestamps,
  repoId: ulid("repo_id")
    .references(() => githubRepoTable.id, { onDelete: "cascade" })
    .notNull(),
  parentEventId: ulid("parent_event_id").references(
    (): AnyPgColumn => githubEventTable.id,
    { onDelete: "set null" },
  ),
  issueNumber: integer("issue_number"),
  pullRequestNumber: integer("pull_request_number"),
  source: varchar("source", { length: 50 }).notNull(), // "webhook" | "action"
  type: varchar("type", { length: 255 }).notNull(), // e.g. "issues.opened", "implement.completed"
  payload: json("payload").$type<Record<string, unknown>>().default({}),
});
