import { and, arrayContains, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTransaction, useTransaction } from "../drizzle/transaction";
import { createID } from "../util/id";
import { fn } from "../util/fn";
import { Common } from "../common";
import { Examples } from "../examples";
import { eventTable } from "./event.sql";
import { OriginType } from "./types";
import type { R2Bucket } from "@cloudflare/workers-types";

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
        description: "Source entity type, e.g. 'github_repo'.",
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
        await tx.insert(eventTable).values({
          id,
          type: input.type,
          origin: input.origin,
          source: input.source,
          sourceId: input.sourceId,
          parentEventId: input.parentEventId,
          tags: (input.tags ?? []),
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
  }): Promise<Info[]> {
    return useTransaction(async (tx) => {
      const conditions = [];
      if (opts.source) conditions.push(eq(eventTable.source, opts.source));
      if (opts.sourceId) conditions.push(eq(eventTable.sourceId, opts.sourceId));
      if (opts.tags?.length) conditions.push(arrayContains(eventTable.tags, opts.tags));
      if (opts.type) conditions.push(eq(eventTable.type, opts.type));
      let query = tx
        .select()
        .from(eventTable)
        .where(and(...conditions))
        .orderBy(desc(eventTable.timeCreated));
      if (opts.limit) query = query.limit(opts.limit) as typeof query;
      return query.then((rows) => rows.map(serialize));
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
