CREATE TABLE "github_event" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"repo_id" char(30) NOT NULL,
	"issue_number" integer,
	"pull_request_number" integer,
	"source" varchar(50) NOT NULL,
	"type" varchar(255) NOT NULL,
	"payload" json DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE "github_pull_request" DROP CONSTRAINT "github_pull_request_issue_id_github_issue_id_fkey";--> statement-breakpoint
DROP TABLE "github_issue";--> statement-breakpoint
DROP TABLE "github_pull_request";--> statement-breakpoint
ALTER TABLE "github_event" ADD CONSTRAINT "github_event_repo_id_github_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repo"("id") ON DELETE CASCADE;