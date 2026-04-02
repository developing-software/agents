import { and, arrayContains, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTransaction, useTransaction } from "../drizzle/transaction";
import { createID } from "../util/id";
import { fn } from "../util/fn";
import { Log } from "../util/log";
import { Common } from "../common";
import { Examples } from "../examples";
import { GithubIssue } from "../github/repo/issue";
import { Repository } from "../repository/index";
import { planTable, PlanStatus, AuthorType } from "./plan.sql";

const log = Log.create({ service: "plan" });

export namespace Plan {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.Plan.id,
      }),
      title: z.string().meta({
        description: "Plan title.",
        example: Examples.Plan.title,
      }),
      body: z.string().meta({
        description: "Plan body in markdown format.",
        example: Examples.Plan.body,
      }),
      status: z.enum(PlanStatus).meta({
        description: "Current plan status.",
        example: Examples.Plan.status,
      }),
      authorType: z.enum(AuthorType).meta({
        description: "Whether this plan was authored by a human or LLM.",
        example: Examples.Plan.authorType,
      }),
      tags: z.array(z.string()).meta({
        description: "Searchable tags, e.g. 'gh:repo:owner/name', 'gh:issue:42'.",
        example: Examples.Plan.tags,
      }),
      data: z.record(z.string(), z.unknown()).meta({
        description: "Arbitrary plan metadata.",
        example: Examples.Plan.data,
      }),
      source: z.string().nullable().meta({
        description: "Source entity type, e.g. 'repository'.",
        example: Examples.Plan.source,
      }),
      sourceId: z.string().nullable().meta({
        description: "ID of the source entity.",
        example: Examples.Plan.sourceId,
      }),
      createdBy: z.string().nullable().meta({
        description: "ID of the user who created this plan.",
        example: Examples.Plan.createdBy,
      }),
      timeCreated: z.string().meta({
        description: "ISO timestamp when the plan was created.",
        example: Examples.Plan.timeCreated,
      }),
      timeUpdated: z.string().meta({
        description: "ISO timestamp when the plan was last updated.",
        example: Examples.Plan.timeUpdated,
      }),
    })
    .meta({
      ref: "Plan",
      description: "A plan or PRD for agent-driven implementation.",
      example: Examples.Plan,
    });

  export type Info = z.infer<typeof Info>;

  export const CreateInput = z.object({
    title: z.string(),
    body: z.string(),
    status: z.enum(PlanStatus).default("draft"),
    authorType: z.enum(AuthorType),
    tags: z.array(z.string()).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    source: z.string().optional(),
    sourceId: z.string().optional(),
    createdBy: z.string().optional(),
  });

  export type CreateInput = z.infer<typeof CreateInput>;

  export const UpdateInput = z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    status: z.enum(PlanStatus).optional(),
    tags: z.array(z.string()).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  });

  export type UpdateInput = z.infer<typeof UpdateInput>;

  export const create = fn(CreateInput, async (input) => {
    return createTransaction(async (tx) => {
      const id = createID("plan");
      log.info("create", { id, title: input.title, status: input.status });
      await tx.insert(planTable).values({
        id,
        title: input.title,
        body: input.body,
        status: input.status,
        authorType: input.authorType,
        tags: input.tags ?? [],
        data: input.data ?? {},
        source: input.source,
        sourceId: input.sourceId,
        createdBy: input.createdBy,
      });
      return id;
    });
  });

  export const fromID = fn(Info.shape.id, async (id) => {
    return useTransaction(async (tx) => {
      const row = await tx
        .select()
        .from(planTable)
        .where(eq(planTable.id, id))
        .then((r) => r[0]);
      return row ? serialize(row) : undefined;
    });
  });

  export async function list(opts: {
    status?: PlanStatus;
    tags?: string[];
    source?: string;
    sourceId?: string;
    limit?: number;
  }): Promise<Info[]> {
    return useTransaction(async (tx) => {
      const conditions = [];
      if (opts.status) conditions.push(eq(planTable.status, opts.status));
      if (opts.tags?.length) conditions.push(arrayContains(planTable.tags, opts.tags));
      if (opts.source) conditions.push(eq(planTable.source, opts.source));
      if (opts.sourceId) conditions.push(eq(planTable.sourceId, opts.sourceId));
      let query = tx
        .select()
        .from(planTable)
        .where(and(...conditions))
        .orderBy(desc(planTable.timeCreated));
      if (opts.limit) query = query.limit(opts.limit) as typeof query;
      return query.then((rows) => rows.map(serialize));
    });
  }

  export async function update(
    id: string,
    input: UpdateInput,
  ): Promise<void> {
    return createTransaction(async (tx) => {
      const values: Record<string, unknown> = { timeUpdated: new Date() };
      if (input.title !== undefined) values.title = input.title;
      if (input.body !== undefined) values.body = input.body;
      if (input.status !== undefined) values.status = input.status;
      if (input.tags !== undefined) values.tags = input.tags;
      if (input.data !== undefined) values.data = input.data;
      log.info("update", { id, fields: Object.keys(values) });
      await tx.update(planTable).set(values).where(eq(planTable.id, id));
    });
  }

  export async function toPrompt(planId: string): Promise<string> {
    const plan = await fromID(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const issueNumbers = plan.tags
      .filter((t) => t.startsWith("gh:issue:"))
      .map((t) => parseInt(t.split(":")[2], 10))
      .filter((n) => !isNaN(n));

    const sections: string[] = [`# Plan: ${plan.title}`, plan.body];

    if (issueNumbers.length > 0 && plan.sourceId) {
      const repo = await Repository.findByID(plan.sourceId);
      if (repo) {
        const issues = await Promise.all(
          issueNumbers.map((n) => GithubIssue.get(repo, n).catch(() => null)),
        );

        const validIssues = issues.filter(
          (i): i is GithubIssue.Info => i !== null,
        );
        if (validIssues.length > 0) {
          sections.push("## Linked Issues");
          for (const issue of validIssues) {
            sections.push(`### Issue #${issue.number}: ${issue.title}`);
            if (issue.body) sections.push(issue.body);
          }
        }
      }
    }

    return sections.join("\n\n");
  }

  function serialize(row: typeof planTable.$inferSelect): Info {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      status: row.status,
      authorType: row.authorType,
      tags: row.tags ?? [],
      data: (row.data as Record<string, unknown>) ?? {},
      source: row.source ?? null,
      sourceId: row.sourceId ?? null,
      createdBy: row.createdBy ?? null,
      timeCreated: row.timeCreated.toISOString(),
      timeUpdated: row.timeUpdated.toISOString(),
    };
  }
}
