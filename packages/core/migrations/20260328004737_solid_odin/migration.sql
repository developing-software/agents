CREATE TABLE "github_installation" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30),
	"installation_id" bigint NOT NULL UNIQUE,
	"owner" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"user_id" char(30),
	"source" varchar(32) NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"connection_id" char(30) NOT NULL,
	"owner" varchar(255) NOT NULL,
	"repo" varchar(255) NOT NULL,
	"full_name" varchar(512) NOT NULL,
	"default_branch" varchar(255)
);
--> statement-breakpoint
DROP TABLE "github_repo";--> statement-breakpoint
CREATE UNIQUE INDEX "repository_source_source_id_key" ON "repository" ("source","source_id");--> statement-breakpoint
ALTER TABLE "github_installation" ADD CONSTRAINT "github_installation_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_connection_id_github_installation_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "github_installation"("id");