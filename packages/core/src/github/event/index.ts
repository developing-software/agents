import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTransaction, useTransaction } from "../../drizzle/transaction";
import { createID } from "../../util/id";
import { fn } from "../../util/fn";
import { Common } from "../../common";
import { Examples } from "../../examples";
import { githubEventTable } from "./event.sql";
import type { R2Bucket } from "@cloudflare/workers-types";

export namespace GithubEvent {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.GithubEvent.id,
      }),
      repoId: z.string().meta({
        description: Common.IdDescription,
        example: Examples.GithubEvent.repoId,
      }),
      parentEventId: z.string().nullable().meta({
        description: "ID of the parent event, if this event is part of a group.",
        example: Examples.GithubEvent.parentEventId,
      }),
      issueNumber: z.number().int().nullable().meta({
        description: "Linked issue number, if any.",
        example: Examples.GithubEvent.issueNumber,
      }),
      pullRequestNumber: z.number().int().nullable().meta({
        description: "Linked pull request number, if any.",
        example: Examples.GithubEvent.pullRequestNumber,
      }),
      source: z.enum(["webhook", "action", "cli", "console"]).meta({
        description: "Origin of the event.",
        example: Examples.GithubEvent.source,
      }),
      type: z.string().meta({
        description: "Event type, e.g. `issues.opened` or `implement.completed`.",
        example: Examples.GithubEvent.type,
      }),
      payload: z.record(z.string(), z.unknown()).meta({
        description: "Arbitrary event data.",
        example: Examples.GithubEvent.payload,
      }),
      timeCreated: z.string().meta({
        description: "ISO timestamp when the event was recorded.",
        example: Examples.GithubEvent.timeCreated,
      }),
    })
    .meta({
      ref: "GithubEvent",
      description: "A recorded GitHub or agent event.",
      example: Examples.GithubEvent,
    });

  export type Info = z.infer<typeof Info>;

  export const create = fn(
    z.object({
      repoId: z.string(),
      parentEventId: z.string().optional(),
      issueNumber: z.number().int().optional(),
      pullRequestNumber: z.number().int().optional(),
      source: z.enum(["webhook", "action", "cli", "console"]),
      type: z.string(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }),
    async (input) => {
      return createTransaction(async (tx) => {
        const id = createID("githubEvent");
        await tx.insert(githubEventTable).values({
          id,
          repoId: input.repoId,
          parentEventId: input.parentEventId,
          issueNumber: input.issueNumber,
          pullRequestNumber: input.pullRequestNumber,
          source: input.source,
          type: input.type,
          payload: input.payload ?? {},
        });
        return id;
      });
    },
  );

  export const fromID = fn(Info.shape.id, async (id) => {
    return useTransaction(async (tx) => {
      const row = await tx
        .select()
        .from(githubEventTable)
        .where(eq(githubEventTable.id, id))
        .then((r) => r[0]);
      return row ? serialize(row) : undefined;
    });
  });

  export async function listByRepo(
    repoId: string,
    opts?: { issueNumber?: number; pullRequestNumber?: number },
  ): Promise<Info[]> {
    return useTransaction(async (tx) => {
      const conditions = [eq(githubEventTable.repoId, repoId)];
      if (opts?.issueNumber !== undefined)
        conditions.push(eq(githubEventTable.issueNumber, opts.issueNumber));
      if (opts?.pullRequestNumber !== undefined)
        conditions.push(eq(githubEventTable.pullRequestNumber, opts.pullRequestNumber));
      return tx
        .select()
        .from(githubEventTable)
        .where(and(...conditions))
        .orderBy(githubEventTable.timeCreated)
        .then((rows) => rows.map(serialize));
    });
  }

  function serialize(row: typeof githubEventTable.$inferSelect): Info {
    return {
      id: row.id,
      repoId: row.repoId,
      parentEventId: row.parentEventId ?? null,
      issueNumber: row.issueNumber ?? null,
      pullRequestNumber: row.pullRequestNumber ?? null,
      source: row.source as "webhook" | "action" | "cli" | "console",
      type: row.type,
      payload: (row.payload as Record<string, unknown>) ?? {},
      timeCreated: row.timeCreated.toISOString(),
    };
  }

  export namespace Artifact {
    export const Info = z
      .object({
        key: z.string().meta({
          description: "R2 storage key for the artifact.",
          example: Examples.GithubEventArtifact.key,
        }),
        name: z.string().meta({
          description: "Artifact filename.",
          example: Examples.GithubEventArtifact.name,
        }),
        size: z.number().int().meta({
          description: "Artifact size in bytes.",
          example: Examples.GithubEventArtifact.size,
        }),
        uploaded: z.string().meta({
          description: "ISO timestamp when the artifact was uploaded.",
          example: Examples.GithubEventArtifact.uploaded,
        }),
      })
      .meta({
        ref: "GithubEventArtifact",
        description: "An artifact associated with a GitHub event.",
        example: Examples.GithubEventArtifact,
      });

    export type Info = z.infer<typeof Info>;

    export function keyPrefix(eventId: string) {
      return `artifacts/${eventId}/`;
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
      // @ts-expect-error idk exaclty
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
  }
}
