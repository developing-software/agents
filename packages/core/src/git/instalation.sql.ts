import { pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, primaryKey, unique } from "drizzle-orm/pg-core";

// export const providerTypeEnum = pgEnum("provider_type", ["github", "gitlab", "bitbucket", "gitea"]);
export const providerTypeEnum = ["github", "gitlab", "bitbucket", "gitea"] as const

export const installations = pgTable("installations", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),

  // Provider-specific IDs
  providerAccountId: text("provider_account_id").notNull(),    // org/user ID on provider
  providerAccountLogin: text("provider_account_login").notNull(), // "acme-corp"
  installationRef: text("installation_ref"),  // GitHub: installation_id; GitLab: group_id; Gitea: base_url

  accountType: text("account_type").notNull(), // "Organization" | "User"
  active: boolean("active").notNull().default(true),
  suspendedAt: timestamp("suspended_at"),
  meta: jsonb("meta"),  // provider-specific extras
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ([
  unique().on(t.provider, t.providerAccountId),
]));
