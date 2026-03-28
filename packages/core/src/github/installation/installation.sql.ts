import { bigint, pgTable as table, varchar } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../../drizzle/types";
import { userTable } from "../../user/user.sql";

export const githubInstallationTable = table("github_installation", {
  ...id,
  ...timestamps,
  userId: ulid("user_id").references(() => userTable.id),
  installationId: bigint("installation_id", { mode: "number" }).notNull().unique(),
  owner: varchar("owner", { length: 255 }).notNull(),
});
