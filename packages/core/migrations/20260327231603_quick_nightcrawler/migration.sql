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
	"data" json DEFAULT '{}'
);
--> statement-breakpoint
DROP TABLE "github_event";--> statement-breakpoint
CREATE INDEX "event_source_idx" ON "event" ("source","source_id");--> statement-breakpoint
CREATE INDEX "event_type_idx" ON "event" ("type");--> statement-breakpoint
CREATE INDEX "event_parent_idx" ON "event" ("parent_event_id");--> statement-breakpoint
CREATE INDEX "event_tags_gin" ON "event" USING gin ("tags");--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_parent_event_id_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "event"("id") ON DELETE SET NULL;