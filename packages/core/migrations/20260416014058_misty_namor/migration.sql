CREATE TABLE "account" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "api_client" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"name" varchar(255) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"redirect" varchar(255) NOT NULL,
	"account_id" char(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_personal_token" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"token" varchar(255) NOT NULL,
	"account_id" char(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"provider" text NOT NULL,
	"subject" varchar(255) NOT NULL,
	"account_id" char(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"source" text,
	"source_id" char(30),
	"parent_event_id" char(30),
	"type" text NOT NULL,
	"origin" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"data" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "installations" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"account_id" char(30),
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"provider_account_login" varchar(255) NOT NULL,
	"installation_ref" varchar(255),
	"account_type" varchar(32) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"suspended_at" timestamp(3) with time zone,
	"meta" jsonb,
	CONSTRAINT "installations_provider_provider_account_id_key" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"account_id" char(30),
	"source" varchar(32) NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"installation_id" char(30) NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"full_name" varchar(512) NOT NULL,
	"default_branch" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"workspace_id" char(30) NOT NULL,
	"account_id" char(30),
	"email" varchar(255),
	"name" varchar(255),
	"avatar_url" varchar(500),
	"role" text DEFAULT 'member' NOT NULL,
	"time_seen" timestamp(3) with time zone,
	"monthly_limit" integer,
	"flags" json DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_provider_subject_key" ON "auth" ("provider","subject");--> statement-breakpoint
CREATE INDEX "auth_account_id_idx" ON "auth" ("account_id");--> statement-breakpoint
CREATE INDEX "event_source_idx" ON "event" ("source","source_id");--> statement-breakpoint
CREATE INDEX "event_type_idx" ON "event" ("type");--> statement-breakpoint
CREATE INDEX "event_parent_idx" ON "event" ("parent_event_id");--> statement-breakpoint
CREATE INDEX "event_tags_gin" ON "event" USING gin ("tags");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_source_source_id_key" ON "repository" ("source","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_workspace_account_key" ON "user" ("workspace_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_workspace_email_key" ON "user" ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "user_account_id_idx" ON "user" ("account_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slug_key" ON "workspace" ("slug");--> statement-breakpoint
ALTER TABLE "api_client" ADD CONSTRAINT "api_client_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD CONSTRAINT "api_personal_token_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth" ADD CONSTRAINT "auth_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_parent_event_id_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "event"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id");--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id");--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_installation_id_installations_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_account_id_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE;