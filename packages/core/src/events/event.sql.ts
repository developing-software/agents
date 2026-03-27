// event.sql.ts
import {
  pgTable as table,
  text,
  json,
  index,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { id, timestamps, ulid } from "../drizzle/types";
import type { OriginType, EventTag } from "./types";


export const eventTable = table(
  "event",
  {
    ...id,
    ...timestamps,
    source: text("source"), // "github_repo", "run" — optional polymorphic ref
    sourceId: ulid("source_id"),   // FK-less reference to source entity
    parentEventId: ulid("parent_event_id").references(
      (): AnyPgColumn => eventTable.id,
      { onDelete: "set null" }
    ),
    type: text("type").notNull(),
    origin: text("origin").notNull().$type<OriginType>(),
    tags: text("tags").array().notNull().default([]).$type<EventTag>(),
    data: json("data").$type<Record<string, unknown>>().default({}),
  },
  (t) => ([
    index("event_source_idx").on(t.source, t.sourceId),
    index("event_type_idx").on(t.type),
    index("event_parent_idx").on(t.parentEventId),
    index("event_tags_gin").using("gin", t.tags),
  ])
);
