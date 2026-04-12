DROP TABLE "plan";--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "data" SET DATA TYPE jsonb USING "data"::jsonb;