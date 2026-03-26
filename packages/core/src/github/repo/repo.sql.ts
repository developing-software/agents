import { bigint, integer, json, pgTable as table, text, varchar } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../../drizzle/types";
import { userTable } from "../../user/user.sql";

export const githubRepoTable = table("github_repo", {
  ...id,
  ...timestamps,
  userId: ulid("user_id").references(() => userTable.id),
  installationId: bigint("installation_id", { mode: "number" }).notNull().unique(),
  owner: varchar("owner", { length: 255 }).notNull(),
  repo: varchar("repo", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 512 }).notNull(),
  defaultBranch: varchar("default_branch", { length: 255 }),
});

export const githubIssueTable = table("github_issue", {
  ...id,
  ...timestamps,
  repoId: ulid("repo_id")
    .references(() => githubRepoTable.id, { onDelete: "cascade" })
    .notNull(),
  number: integer("number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  labels: json("labels").$type<string[]>().default([]),
  body: text("body"),
});

export const githubPullRequestTable = table("github_pull_request", {
  ...id,
  ...timestamps,
  repoId: ulid("repo_id")
    .references(() => githubRepoTable.id, { onDelete: "cascade" })
    .notNull(),
  issueId: ulid("issue_id").references(() => githubIssueTable.id),
  number: integer("number").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  headBranch: varchar("head_branch", { length: 255 }).notNull(),
  baseBranch: varchar("base_branch", { length: 255 }).notNull(),
});
