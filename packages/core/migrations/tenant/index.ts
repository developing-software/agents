// Written by `src/drizzle/bundle.ts` on `db:generate`; never edit by hand.
import type { MigrationMeta } from "drizzle-orm/migrator";

const migrations: MigrationMeta[] = [
  {
    sql: [
      'CREATE TABLE "issue" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"created_by" char(30) NOT NULL,\n\t"assignee" char(30),\n\t"source" text,\n\t"source_id" char(30),\n\t"parent_id" char(30),\n\t"position" integer DEFAULT 0 NOT NULL,\n\t"stage" text,\n\t"title" text NOT NULL,\n\t"body" text,\n\t"status" text DEFAULT \'backlog\' NOT NULL,\n\t"reason" text,\n\t"tags" text[] DEFAULT \'{}\'::text[] NOT NULL,\n\t"start_date" timestamp(3) with time zone,\n\t"due_date" timestamp(3) with time zone,\n\t"time_started" timestamp(3) with time zone,\n\t"time_done" timestamp(3) with time zone,\n\t"metadata" jsonb DEFAULT \'{"annotations":{},"links":[]}\' NOT NULL\n);\n',
      '\nCREATE TABLE "connection" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"user_id" char(30) NOT NULL,\n\t"provider" varchar(64) NOT NULL,\n\t"account_id" varchar(255),\n\t"scopes" text[] DEFAULT \'{}\'::text[] NOT NULL,\n\t"access_token" text NOT NULL,\n\t"refresh_token" text,\n\t"token_expires_at" timestamp(3) with time zone\n);\n',
      '\nCREATE TABLE "conversation_message" (\n\t"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "conversation_message_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),\n\t"conversation_id" uuid NOT NULL,\n\t"run_id" text,\n\t"role" text NOT NULL,\n\t"content" jsonb NOT NULL,\n\t"text" text,\n\t"tools" text[] DEFAULT \'{}\'::text[] NOT NULL,\n\t"model" text,\n\t"tokens_in" integer,\n\t"tokens_out" integer,\n\t"duration_ms" integer,\n\t"error" text,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL\n);\n',
      '\nCREATE TABLE "conversation" (\n\t"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"agent" varchar(64) NOT NULL,\n\t"thread" varchar(255) NOT NULL,\n\t"user_id" char(30) NOT NULL,\n\t"title" varchar(200)\n);\n',
      '\nCREATE TABLE "event" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"user_id" char(30),\n\t"identity" jsonb DEFAULT \'{"type":"public","properties":{}}\' NOT NULL,\n\t"type" text NOT NULL,\n\t"source" text,\n\t"source_id" char(30),\n\t"tags" text[] DEFAULT \'{}\'::text[] NOT NULL,\n\t"data" jsonb DEFAULT \'{}\' NOT NULL\n);\n',
      '\nCREATE TABLE "webhook" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"user_id" char(30) NOT NULL,\n\t"url" text NOT NULL,\n\t"secret" text NOT NULL,\n\t"types" text[] DEFAULT \'{}\'::text[] NOT NULL,\n\t"enabled" boolean DEFAULT true NOT NULL,\n\t"failures" integer DEFAULT 0 NOT NULL,\n\t"last_status" integer,\n\t"time_delivered" timestamp(3) with time zone\n);\n',
      '\nCREATE TABLE "project" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"created_by" char(30) NOT NULL,\n\t"name" text NOT NULL,\n\t"description" text,\n\t"image" text,\n\t"metadata" jsonb DEFAULT \'{"annotations":{},"links":[]}\' NOT NULL\n);\n',
      '\nCREATE TABLE "user" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"name" text NOT NULL,\n\t"email" text NOT NULL,\n\t"image" text,\n\t"role" text DEFAULT \'member\' NOT NULL,\n\t"kind" text DEFAULT \'human\' NOT NULL,\n\t"owner_id" char(30)\n);\n',
      '\nCREATE INDEX "issue_source" ON "issue" ("source","source_id","status");',
      '\nCREATE INDEX "issue_assignee" ON "issue" ("assignee","status");',
      '\nCREATE INDEX "issue_stage" ON "issue" ("source","source_id","stage");',
      '\nCREATE INDEX "issue_parent" ON "issue" ("parent_id","position");',
      '\nCREATE UNIQUE INDEX "issue_github" ON "issue" (("metadata" -> \'annotations\' ->> \'github.com/issue-id\')) WHERE "time_deleted" is null and ("metadata" -> \'annotations\') ? \'github.com/issue-id\';',
      '\nCREATE UNIQUE INDEX "connection_user_provider" ON "connection" ("user_id","provider");',
      '\nCREATE INDEX "connection_user" ON "connection" ("user_id");',
      '\nCREATE INDEX "conversation_message_conversation" ON "conversation_message" ("conversation_id","id");',
      '\nCREATE INDEX "conversation_message_search" ON "conversation_message" USING gin (to_tsvector(\'english\', coalesce("text", \'\')));',
      '\nCREATE UNIQUE INDEX "conversation_thread" ON "conversation" ("thread") WHERE "time_deleted" is null;',
      '\nCREATE INDEX "conversation_user" ON "conversation" ("user_id","agent","time_updated");',
      '\nCREATE INDEX "event_user" ON "event" ("user_id");',
      '\nCREATE INDEX "event_source" ON "event" ("source","source_id");',
      '\nCREATE INDEX "event_type" ON "event" ("type");',
      '\nCREATE INDEX "event_tags" ON "event" USING gin ("tags");',
      '\nCREATE INDEX "webhook_enabled" ON "webhook" ("enabled");',
      '\nCREATE INDEX "webhook_user" ON "webhook" ("user_id");',
      '\nCREATE INDEX "project_created_by" ON "project" ("created_by");',
      '\nCREATE INDEX "project_metadata" ON "project" USING gin ("metadata");',
      '\nCREATE UNIQUE INDEX "user_email" ON "user" ("email");',
    ],
    bps: true,
    folderMillis: 1794880822000,
    hash: "fde86b053598517dc40d370c1a4fddd4decca364e31474fb6ed0f2aa237d865d",
    name: "20261117020022_past_malcolm_colcord",
  },
];
export default migrations;
