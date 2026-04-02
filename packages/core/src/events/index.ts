import { and, arrayContains, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { createTransaction, useTransaction } from "../drizzle/transaction";
import { createID } from "../util/id";
import { fn } from "../util/fn";
import { Log } from "../util/log";
import { Common } from "../common";
import { Examples } from "../examples";
import { eventTable } from "./event.sql";
import { OriginType } from "./types";
import type { R2Bucket } from "@cloudflare/workers-types";

const log = Log.create({ service: "event" });

export namespace Event {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.Event.id,
      }),
      parentEventId: z.string().nullable().meta({
        description: "ID of the parent event, if this event is part of a chain.",
        example: Examples.Event.parentEventId,
      }),
      source: z.string().nullable().meta({
        description: "Source entity type, e.g. 'repository'.",
        example: Examples.Event.source,
      }),
      sourceId: z.string().nullable().meta({
        description: "ID of the source entity.",
        example: Examples.Event.sourceId,
      }),
      type: z.string().meta({
        description: "Event type, e.g. 'github.issues.opened'.",
        example: Examples.Event.type,
      }),
      origin: z.enum(OriginType).meta({
        description: "What triggered this event.",
        example: Examples.Event.origin,
      }),
      tags: z.array(z.string()).meta({
        description: "Searchable tags, e.g. 'gh:repo:owner/name', 'gh:issue:42'.",
        example: Examples.Event.tags,
      }),
      data: z.record(z.string(), z.unknown()).meta({
        description: "Arbitrary event data.",
        example: Examples.Event.data,
      }),
      timeCreated: z.string().meta({
        description: "ISO timestamp when the event was recorded.",
        example: Examples.Event.timeCreated,
      }),
    })
    .meta({
      ref: "Event",
      description: "A recorded system or agent event.",
      example: Examples.Event,
    });

  export type Info = z.infer<typeof Info>;

  export type TreeNode = Info & { children: TreeNode[] };

  export const IngestInput = z
    .object({
      repositoryId: z.string().optional().meta({
        description: Common.IdDescription,
        example: Examples.Repository.id,
      }),
      repoFullName: z.string().optional().meta({
        description: "Full repository name in `owner/repo` format.",
        example: Examples.Repository.fullName,
      }),
      parentEventId: Info.shape.parentEventId.optional().meta({
        description: "Parent event ID to group related events.",
        example: null,
      }),
      origin: z.enum(OriginType).meta({
        description: "Origin of the event.",
        example: Examples.Event.origin,
      }),
      type: Info.shape.type,
      tags: Info.shape.tags.optional(),
      data: Info.shape.data.optional(),
    })
    .refine((value) => Boolean(value.repositoryId || value.repoFullName), {
      message: "Either `repositoryId` or `repoFullName` is required",
      path: ["repositoryId"],
    })
    .meta({
      ref: "EventIngestInput",
      description: "Event payload submitted by external producers.",
      example: {
        repoFullName: Examples.Repository.fullName,
        origin: Examples.Event.origin,
        type: Examples.Event.type,
        tags: Examples.Event.tags,
        data: Examples.Event.data,
      },
    });

  export type IngestInput = z.infer<typeof IngestInput>;

  export const create = fn(
    z.object({
      type: z.string(),
      origin: z.enum(OriginType),
      source: z.string().optional(),
      sourceId: z.string().optional(),
      parentEventId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      data: z.record(z.string(), z.unknown()).optional(),
    }),
    async (input) => {
      return createTransaction(async (tx) => {
        const id = createID("event");
        const parentEventId = await inferParentEventId(input);
        log.info("create", {
          id,
          type: input.type,
          source: input.origin,
          sourceId: input.sourceId,
          parentEventId,
        });
        await tx.insert(eventTable).values({
          id,
          type: input.type,
          origin: input.origin,
          source: input.source,
          sourceId: input.sourceId,
          parentEventId,
          tags: input.tags ?? [],
          data: input.data ?? {},
        });
        return id;
      });
    },
  );

  export const fromID = fn(Info.shape.id, async (id) => {
    return useTransaction(async (tx) => {
      const row = await tx
        .select()
        .from(eventTable)
        .where(eq(eventTable.id, id))
        .then((r) => r[0]);
      return row ? serialize(row) : undefined;
    });
  });

  export async function list(opts: {
    source?: string;
    sourceId?: string;
    tags?: string[];
    type?: string;
    limit?: number;
    from?: string;
    to?: string;
  }): Promise<Info[]> {
    return useTransaction(async (tx) => {
      const conditions = [];
      if (opts.source) conditions.push(eq(eventTable.source, opts.source));
      if (opts.sourceId) conditions.push(eq(eventTable.sourceId, opts.sourceId));
      if (opts.tags?.length) conditions.push(arrayContains(eventTable.tags, opts.tags));
      if (opts.type) conditions.push(eq(eventTable.type, opts.type));
      if (opts.from) conditions.push(gte(eventTable.timeCreated, new Date(opts.from)));
      if (opts.to) conditions.push(lte(eventTable.timeCreated, new Date(opts.to)));
      let query = tx
        .select()
        .from(eventTable)
        .where(and(...conditions))
        .orderBy(desc(eventTable.timeCreated));
      if (opts.limit) query = query.limit(opts.limit) as typeof query;
      return query.then((rows) => rows.map(serialize));
    });
  }

  export async function findParent(opts: {
    source?: string;
    sourceId?: string;
    tags?: string[];
  }): Promise<string | undefined> {
    return useTransaction(async (tx) => {
      const conditions = [];
      if (opts.source) conditions.push(eq(eventTable.source, opts.source));
      if (opts.sourceId) conditions.push(eq(eventTable.sourceId, opts.sourceId));
      if (opts.tags?.length) conditions.push(arrayContains(eventTable.tags, opts.tags));
      conditions.push(isNull(eventTable.parentEventId));
      const row = await tx
        .select({ id: eventTable.id })
        .from(eventTable)
        .where(and(...conditions))
        .orderBy(eventTable.timeCreated)
        .limit(1)
        .then((r) => r[0]);
      return row?.id;
    });
  }

  export async function inferParentEventId(opts: {
    source?: string;
    sourceId?: string;
    type?: string;
    tags?: string[];
    parentEventId?: string;
  }): Promise<string | undefined> {
    if (opts.parentEventId !== undefined && opts.parentEventId !== null) {
      return opts.parentEventId;
    }

    const prTag = opts.tags?.find((tag) => tag.startsWith("gh:pr:"));
    if (prTag) {
      const parentEventId = await findParent({ tags: [prTag] }).catch(() => undefined);
      if (parentEventId) {
        return parentEventId;
      }
    }

    const issueTag = opts.tags?.find((tag) => tag.startsWith("gh:issue:"));
    if (issueTag) {
      const parentEventId = await findParent({ tags: [issueTag] }).catch(() => undefined);
      if (parentEventId) {
        return parentEventId;
      }
    }

    const runTag = opts.tags?.find((tag) => tag.startsWith("gh:run:"));
    if (runTag) {
      const parentEventId = await findParent({ tags: [runTag] }).catch(() => undefined);
      if (parentEventId) {
        return parentEventId;
      }
    }

    return opts.parentEventId;
  }


  export async function listTree(opts: {
    source?: string;
    sourceId?: string;
    tags?: string[];
    type?: string;
    from?: string;
    to?: string;
  }): Promise<TreeNode[]> {
    return useTransaction(async (tx) => {
      const rows = await tx.execute(sql`
        WITH RECURSIVE event_tree AS (
          SELECT id, time_created, time_updated, source, source_id, parent_event_id, type, origin, tags FROM ${eventTable}
          WHERE parent_event_id IS NULL
            ${opts.source ? sql`AND source = ${opts.source}` : sql``}
            ${opts.sourceId ? sql`AND source_id = ${opts.sourceId}` : sql``}
            ${opts.tags?.length ? sql`AND tags @> ${JSON.stringify(opts.tags)}::text[]` : sql``}
            ${opts.type ? sql`AND type = ${opts.type}` : sql``}
            ${opts.from ? sql`AND time_created >= ${opts.from}::timestamptz` : sql``}
            ${opts.to ? sql`AND time_created <= ${opts.to}::timestamptz` : sql``}
          UNION ALL
          SELECT e.id, e.time_created, e.time_updated, e.source, e.source_id, e.parent_event_id, e.type, e.origin, e.tags FROM ${eventTable} e
          JOIN event_tree et ON e.parent_event_id = et.id
        )
        SELECT * FROM event_tree
        ORDER BY time_created ASC
      `);

      log.info("listTree", {
        source: opts.source,
        sourceId: opts.sourceId,
        type: opts.type,
        rows: (rows as any[]).length,
      });

      const byId = new Map<string, TreeNode>();
      for (const row of rows as any[]) {
        const node: TreeNode = {
          id: row.id,
          parentEventId: row.parent_event_id ?? null,
          source: row.source ?? null,
          sourceId: row.source_id ?? null,
          type: row.type,
          origin: row.origin,
          tags: row.tags ?? [],
          data: {},
          timeCreated: new Date(row.time_created).toISOString(),
          children: [],
        };
        byId.set(node.id, node);
      }

      const roots: TreeNode[] = [];
      for (const node of byId.values()) {
        if (node.parentEventId && byId.has(node.parentEventId)) {
          byId.get(node.parentEventId)!.children.push(node);
        } else {
          roots.push(node);
        }
      }
      return roots;
    });
  }

  function serialize(row: typeof eventTable.$inferSelect): Info {
    return {
      id: row.id,
      parentEventId: row.parentEventId ?? null,
      source: row.source ?? null,
      sourceId: row.sourceId ?? null,
      type: row.type,
      origin: row.origin as Info["origin"],
      tags: row.tags ?? [],
      data: (row.data as Record<string, unknown>) ?? {},
      timeCreated: row.timeCreated.toISOString(),
    };
  }

  export namespace Artifact {
    export const Info = z
      .object({
        key: z.string().meta({
          description: "R2 storage key for the artifact.",
          example: Examples.EventArtifact.key,
        }),
        name: z.string().meta({
          description: "Artifact filename.",
          example: Examples.EventArtifact.name,
        }),
        size: z.number().int().meta({
          description: "Artifact size in bytes.",
          example: Examples.EventArtifact.size,
        }),
        uploaded: z.string().meta({
          description: "ISO timestamp when the artifact was uploaded.",
          example: Examples.EventArtifact.uploaded,
        }),
      })
      .meta({
        ref: "EventArtifact",
        description: "An artifact stored in R2 associated with an event.",
        example: Examples.EventArtifact,
      });

    export type Info = z.infer<typeof Info>;

    export function keyPrefix(eventId: string) {
      return `events/${eventId}/artifacts/`;
    }

    export async function upload(
      bucket: R2Bucket,
      eventId: string,
      name: string,
      body:
        | string
        | ArrayBuffer
        | ArrayBufferView<ArrayBufferLike>
        | ReadableStream<any>
        | Blob
        | null,
      contentType: string,
    ): Promise<Info> {
      const key = `${keyPrefix(eventId)}${name}`;
      // @ts-expect-error idk exactly
      const obj = await bucket.put(key, body, { httpMetadata: { contentType } });
      return { key, name, size: obj!.size, uploaded: obj!.uploaded.toISOString() };
    }

    export async function listByEvent(bucket: R2Bucket, eventId: string): Promise<Info[]> {
      const prefix = keyPrefix(eventId);
      const listed = await bucket.list({ prefix });
      return listed.objects.map((o) => ({
        key: o.key,
        name: o.key.slice(prefix.length),
        size: o.size,
        uploaded: o.uploaded.toISOString(),
      }));
    }

    export async function get(bucket: R2Bucket, key: string) {
      return bucket.get(key);
    }
  }
}
