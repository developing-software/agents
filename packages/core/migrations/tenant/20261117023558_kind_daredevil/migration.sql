CREATE TABLE "issue" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"created_by" char(30) NOT NULL,
	"assignee" char(30),
	"source" text,
	"source_id" char(30),
	"parent_id" char(30),
	"position" integer DEFAULT 0 NOT NULL,
	"stage" text,
	"title" text NOT NULL,
	"body" text,
	"status" text DEFAULT 'backlog' NOT NULL,
	"reason" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"start_date" timestamp(3) with time zone,
	"due_date" timestamp(3) with time zone,
	"time_started" timestamp(3) with time zone,
	"time_done" timestamp(3) with time zone,
	"metadata" jsonb DEFAULT '{"annotations":{},"links":[]}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connection" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"account_id" varchar(255),
	"scopes" text[] DEFAULT '{}'::text[] NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expires_at" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation_message" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_message_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"conversation_id" uuid NOT NULL,
	"run_id" text,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"text" text,
	"tools" text[] DEFAULT '{}'::text[] NOT NULL,
	"model" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"duration_ms" integer,
	"error" text,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"agent" varchar(64) NOT NULL,
	"thread" varchar(255) NOT NULL,
	"user_id" char(30) NOT NULL,
	"title" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30),
	"identity" jsonb DEFAULT '{"type":"public","properties":{}}' NOT NULL,
	"type" text NOT NULL,
	"source" text,
	"source_id" char(30),
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30) NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"types" text[] DEFAULT '{}'::text[] NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"last_status" integer,
	"time_delivered" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"created_by" char(30) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"metadata" jsonb DEFAULT '{"annotations":{},"links":[]}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" char(30) NOT NULL,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"image" text,
	"role" text DEFAULT 'member' NOT NULL,
	"kind" text DEFAULT 'human' NOT NULL,
	"owner_id" char(30)
);
--> statement-breakpoint
CREATE INDEX "issue_source" ON "issue" ("source","source_id","status");--> statement-breakpoint
CREATE INDEX "issue_assignee" ON "issue" ("assignee","status");--> statement-breakpoint
CREATE INDEX "issue_stage" ON "issue" ("source","source_id","stage");--> statement-breakpoint
CREATE INDEX "issue_parent" ON "issue" ("parent_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_github" ON "issue" (("metadata" -> 'annotations' ->> 'github.com/issue-id')) WHERE "time_deleted" is null and ("metadata" -> 'annotations') ? 'github.com/issue-id';--> statement-breakpoint
CREATE UNIQUE INDEX "connection_user_provider" ON "connection" ("user_id","provider");--> statement-breakpoint
CREATE INDEX "connection_user" ON "connection" ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_message_conversation" ON "conversation_message" ("conversation_id","id");--> statement-breakpoint
CREATE INDEX "conversation_message_search" ON "conversation_message" USING gin (to_tsvector('english', coalesce("text", '')));--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_thread" ON "conversation" ("thread") WHERE "time_deleted" is null;--> statement-breakpoint
CREATE INDEX "conversation_user" ON "conversation" ("user_id","agent","time_updated");--> statement-breakpoint
CREATE INDEX "event_user" ON "event" ("user_id");--> statement-breakpoint
CREATE INDEX "event_source" ON "event" ("source","source_id");--> statement-breakpoint
CREATE INDEX "event_type" ON "event" ("type");--> statement-breakpoint
CREATE INDEX "event_tags" ON "event" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "webhook_enabled" ON "webhook" ("enabled");--> statement-breakpoint
CREATE INDEX "webhook_user" ON "webhook" ("user_id");--> statement-breakpoint
CREATE INDEX "project_created_by" ON "project" ("created_by");--> statement-breakpoint
CREATE INDEX "project_metadata" ON "project" USING gin ("metadata");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email" ON "user" ("email");