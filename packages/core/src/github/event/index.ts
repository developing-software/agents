import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTransaction, useTransaction } from "../../drizzle/transaction";
import { createID } from "../../util/id";
import { fn } from "../../util/fn";
import { Common } from "../../common";
import { Examples } from "../../examples";
import { githubEventTable } from "./event.sql";

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
      issueNumber: z.number().int().nullable().meta({
        description: "Linked issue number, if any.",
        example: Examples.GithubEvent.issueNumber,
      }),
      pullRequestNumber: z.number().int().nullable().meta({
        description: "Linked pull request number, if any.",
        example: Examples.GithubEvent.pullRequestNumber,
      }),
      source: z.enum(["webhook", "action"]).meta({
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
      issueNumber: z.number().int().optional(),
      pullRequestNumber: z.number().int().optional(),
      source: z.enum(["webhook", "action"]),
      type: z.string(),
      payload: z.record(z.string(), z.unknown()).optional(),
    }),
    async (input) => {
      return createTransaction(async (tx) => {
        const id = createID("githubEvent");
        await tx.insert(githubEventTable).values({
          id,
          repoId: input.repoId,
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
      issueNumber: row.issueNumber ?? null,
      pullRequestNumber: row.pullRequestNumber ?? null,
      source: row.source as "webhook" | "action",
      type: row.type,
      payload: (row.payload as Record<string, unknown>) ?? {},
      timeCreated: row.timeCreated.toISOString(),
    };
  }
}
