ALTER TABLE "api_personal_token" DROP CONSTRAINT "api_personal_token_account_id_account_id_fkey";--> statement-breakpoint
ALTER TABLE "installations" DROP CONSTRAINT "installations_account_id_account_id_fkey";--> statement-breakpoint
ALTER TABLE "repository" DROP CONSTRAINT "repository_account_id_account_id_fkey";--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD COLUMN "user_id" char(30) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD COLUMN "name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD COLUMN "prefix" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD COLUMN "last_used_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD COLUMN "expires_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "installations" ADD COLUMN "workspace_id" char(30);--> statement-breakpoint
ALTER TABLE "repository" ADD COLUMN "workspace_id" char(30);--> statement-breakpoint
ALTER TABLE "api_personal_token" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "installations" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "repository" DROP COLUMN "account_id";--> statement-breakpoint
ALTER TABLE "api_personal_token" ALTER COLUMN "token" SET DATA TYPE varchar(64) USING "token"::varchar(64);--> statement-breakpoint
CREATE INDEX "api_personal_token_user_idx" ON "api_personal_token" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_personal_token_token_key" ON "api_personal_token" ("token");--> statement-breakpoint
CREATE INDEX "installations_workspace_idx" ON "installations" ("workspace_id");--> statement-breakpoint
CREATE INDEX "repository_workspace_idx" ON "repository" ("workspace_id");--> statement-breakpoint
ALTER TABLE "api_personal_token" ADD CONSTRAINT "api_personal_token_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "installations" ADD CONSTRAINT "installations_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id");--> statement-breakpoint
ALTER TABLE "repository" ADD CONSTRAINT "repository_workspace_id_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id");