import { bigint, pgTable as table, varchar } from "drizzle-orm/pg-core";
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
