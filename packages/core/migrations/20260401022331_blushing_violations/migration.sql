CREATE TABLE "plan" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"author_type" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"data" json DEFAULT '{}',
	"source" text,
	"source_id" char(30),
	"created_by" char(30)
);
--> statement-breakpoint
CREATE INDEX "plan_tags_gin" ON "plan" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "plan_status_idx" ON "plan" ("status");--> statement-breakpoint
CREATE INDEX "plan_source_idx" ON "plan" ("source","source_id");