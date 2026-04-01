import { pgTable as table, text, json, index } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";
import type { Tag } from "../tag";

export const PlanStatus = ["draft", "review", "approved", "implementing", "completed", "rejected"] as const;
export type PlanStatus = (typeof PlanStatus)[number];

export const AuthorType = ["human", "llm"] as const;
export type AuthorType = (typeof AuthorType)[number];

export const planTable = table(
  "plan",
  {
    ...id,
    ...timestamps,
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().$type<PlanStatus>(),
    authorType: text("author_type").notNull().$type<AuthorType>(),
    tags: text("tags").array().notNull().default([]).$type<Tag>(),
    data: json("data").$type<Record<string, unknown>>().default({}),
    source: text("source"),
    sourceId: ulid("source_id"),
    createdBy: ulid("created_by"),
  },
  (t) => [
    index("plan_tags_gin").using("gin", t.tags),
    index("plan_status_idx").on(t.status),
    index("plan_source_idx").on(t.source, t.sourceId),
  ],
);
