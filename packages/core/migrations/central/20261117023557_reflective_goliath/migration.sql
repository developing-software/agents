CREATE SCHEMA "central";
--> statement-breakpoint
CREATE TABLE "central"."provider" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30) NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"secret" text
);
--> statement-breakpoint
CREATE TABLE "central"."kv" (
	"key" text PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"value" text NOT NULL,
	"time_expires" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "central"."job" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"name" text NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"identity" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"time_available" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_reserved" timestamp(3) with time zone,
	"time_failed" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "central"."key" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30),
	"workspace" text,
	"name" varchar(255) NOT NULL,
	"key" varchar(128) NOT NULL,
	"type" text DEFAULT 'api' NOT NULL,
	"meta" jsonb DEFAULT '{}' NOT NULL,
	"expires_at" timestamp(3) with time zone,
	"time_used" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "central"."access" (
	"user_id" char(30) NOT NULL,
	"workspace_id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "central"."invite" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"workspace_id" char(30) NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by" char(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "central"."workspace" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"schema" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "central"."account" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"prefs" jsonb DEFAULT '{"theme":"system","locale":"en","zone":null,"date":"system","time":"system"}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_account" ON "central"."provider" ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "provider_user" ON "central"."provider" ("user_id");--> statement-breakpoint
CREATE INDEX "job_reserve" ON "central"."job" ("time_failed","time_available");--> statement-breakpoint
CREATE UNIQUE INDEX "key_value" ON "central"."key" ("key");--> statement-breakpoint
CREATE INDEX "key_user" ON "central"."key" ("user_id");--> statement-breakpoint
CREATE INDEX "key_type" ON "central"."key" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "access_user_workspace" ON "central"."access" ("user_id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_workspace_email" ON "central"."invite" ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "invite_email" ON "central"."invite" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_slug" ON "central"."workspace" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_schema" ON "central"."workspace" ("schema");--> statement-breakpoint
CREATE UNIQUE INDEX "account_email" ON "central"."account" ("email");