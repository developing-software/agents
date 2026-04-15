import { bigint, pgTable as table, varchar } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../../drizzle/types";
import { accountTable } from "../../account/account.sql";

export const githubInstallationTable = table("github_installation", {
  ...id,
  ...timestamps,
  accountId: ulid("account_id").references(() => accountTable.id),
  installationId: bigint("installation_id", { mode: "number" }).notNull().unique(),
  owner: varchar("owner", { length: 255 }).notNull(),
});
