CREATE TABLE "api_client" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"name" varchar(255) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"redirect" varchar(255) NOT NULL,
	"user_id" char(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_personal_token" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"token" varchar(255) NOT NULL,
	"user_id" char(30) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_issue" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"repo_id" char(30) NOT NULL,
	"number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"state" varchar(50) NOT NULL,
	"labels" json DEFAULT '[]',
	"body" text
);
--> statement-breakpoint
CREATE TABLE "github_pull_request" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"repo_id" char(30) NOT NULL,
	"issue_id" char(30),
	"number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"state" varchar(50) NOT NULL,
	"head_branch" varchar(255) NOT NULL,
	"base_branch" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_repo" (
	"id" char(30) PRIMARY KEY,
	"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"time_deleted" timestamp(3) with time zone,
	"installation_id" bigint NOT NULL UNIQUE,
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
	"name" varchar(255),
	"email" varchar(255),
	"username" varchar(255) UNIQUE,
	"avatar_url" varchar(500),
	"flags" json DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE "api_client" ADD CONSTRAINT "api_client_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD CONSTRAINT "api_personal_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "github_issue" ADD CONSTRAINT "github_issue_repo_id_github_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repo"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "github_pull_request" ADD CONSTRAINT "github_pull_request_repo_id_github_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repo"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "github_pull_request" ADD CONSTRAINT "github_pull_request_issue_id_github_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "github_issue"("id");