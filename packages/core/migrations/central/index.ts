// Written by `src/drizzle/bundle.ts` on `db:generate`; never edit by hand.
import type { MigrationMeta } from "drizzle-orm/migrator";

const migrations: MigrationMeta[] = [
  {
    sql: [
      'CREATE SCHEMA "central";\n',
      '\nCREATE TABLE "central"."provider" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"user_id" char(30) NOT NULL,\n\t"provider_id" text NOT NULL,\n\t"account_id" varchar(255) NOT NULL,\n\t"secret" text\n);\n',
      '\nCREATE TABLE "central"."kv" (\n\t"key" text PRIMARY KEY,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"value" text NOT NULL,\n\t"time_expires" timestamp(3) with time zone\n);\n',
      '\nCREATE TABLE "central"."job" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"name" text NOT NULL,\n\t"payload" jsonb DEFAULT \'{}\' NOT NULL,\n\t"identity" jsonb,\n\t"attempts" integer DEFAULT 0 NOT NULL,\n\t"error" text,\n\t"time_available" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_reserved" timestamp(3) with time zone,\n\t"time_failed" timestamp(3) with time zone\n);\n',
      '\nCREATE TABLE "central"."key" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"user_id" char(30),\n\t"name" varchar(255) NOT NULL,\n\t"key" varchar(128) NOT NULL,\n\t"type" text DEFAULT \'api\' NOT NULL,\n\t"meta" jsonb DEFAULT \'{}\' NOT NULL,\n\t"expires_at" timestamp(3) with time zone,\n\t"time_used" timestamp(3) with time zone\n);\n',
      '\nCREATE TABLE "central"."access" (\n\t"user_id" char(30) NOT NULL,\n\t"workspace_id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone\n);\n',
      '\nCREATE TABLE "central"."workspace" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"slug" text NOT NULL,\n\t"name" text NOT NULL,\n\t"schema" text NOT NULL,\n\t"status" text DEFAULT \'pending\' NOT NULL\n);\n',
      '\nCREATE TABLE "central"."user" (\n\t"id" char(30) NOT NULL,\n\t"time_created" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_updated" timestamp(3) with time zone DEFAULT now() NOT NULL,\n\t"time_deleted" timestamp(3) with time zone,\n\t"name" text NOT NULL,\n\t"email" text NOT NULL,\n\t"email_verified" boolean DEFAULT false NOT NULL,\n\t"image" text,\n\t"role" text DEFAULT \'member\' NOT NULL,\n\t"kind" text DEFAULT \'human\' NOT NULL,\n\t"owner_id" char(30),\n\t"prefs" jsonb DEFAULT \'{"theme":"system","locale":"en","zone":null,"date":"system","time":"system"}\' NOT NULL\n);\n',
      '\nCREATE UNIQUE INDEX "provider_account" ON "central"."provider" ("provider_id","account_id");',
      '\nCREATE INDEX "provider_user" ON "central"."provider" ("user_id");',
      '\nCREATE INDEX "job_reserve" ON "central"."job" ("time_failed","time_available");',
      '\nCREATE UNIQUE INDEX "key_value" ON "central"."key" ("key");',
      '\nCREATE INDEX "key_user" ON "central"."key" ("user_id");',
      '\nCREATE INDEX "key_type" ON "central"."key" ("type");',
      '\nCREATE UNIQUE INDEX "access_user_workspace" ON "central"."access" ("user_id","workspace_id");',
      '\nCREATE UNIQUE INDEX "workspace_slug" ON "central"."workspace" ("slug");',
      '\nCREATE UNIQUE INDEX "workspace_schema" ON "central"."workspace" ("schema");',
      '\nCREATE UNIQUE INDEX "user_email" ON "central"."user" ("email");',
    ],
    bps: true,
    folderMillis: 1794878144000,
    hash: "5cf9146d5ecc1716f19bce47bbac32e251bf0b5dae9afa01350194794b89269d",
    name: "20261117011544_boring_gauntlet",
  },
];
export default migrations;
