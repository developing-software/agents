import { z } from "zod";
import { fn } from "../../util/fn";
import { Log } from "../../util/log";
import { Common } from "../../common";
import { Examples } from "../../examples";
import { Event } from "../index";
import { render as renderContext } from "./context";
import { PlanStatus, AuthorType } from "./plan.sql";
import type { PlanEventData } from "./plan.sql";

const log = Log.create({ service: "plan" });

export namespace Plan {
  export const ToPromptOptions = z
    .object({
      includeIssueDetails: z.boolean().optional(),
    })
    .default({});

  export type ToPromptOptions = z.input<typeof ToPromptOptions>;

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
      parentEventId: z.string().nullable().meta({
        description: "ID of the parent event, if this is a sub-plan.",
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
    parentEventId: z.string().optional(),
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
    log.info("create", { title: input.title, status: input.status });
    return Event.create({
      type: "plan",
      origin: "console",
      source: input.source,
      sourceId: input.sourceId,
      parentEventId: input.parentEventId,
      tags: input.tags ?? [],
      data: {
        title: input.title,
        body: input.body,
        status: input.status,
        authorType: input.authorType,
        createdBy: input.createdBy,
        ...(input.data ?? {}),
      },
    });
  });

  export const fromID = fn(Info.shape.id, async (id) => {
    const event = await Event.fromID(id);
    if (!event || event.type !== "plan") return undefined;
    return serialize(event);
  });

  export async function list(opts: {
    status?: PlanStatus;
    tags?: string[];
    source?: string;
    sourceId?: string;
    limit?: number;
  }): Promise<Info[]> {
    const events = await Event.list({
      source: opts.source,
      sourceId: opts.sourceId,
      tags: opts.tags,
      type: "plan",
      limit: opts.limit,
    });
    const plans = events.map(serialize);
    if (opts.status) return plans.filter((p) => p.status === opts.status);
    return plans;
  }

  export async function update(id: string, input: UpdateInput): Promise<void> {
    const dataPatch: Record<string, unknown> = {};
    if (input.title !== undefined) dataPatch.title = input.title;
    if (input.body !== undefined) dataPatch.body = input.body;
    if (input.status !== undefined) dataPatch.status = input.status;
    if (input.data !== undefined) Object.assign(dataPatch, input.data);

    log.info("update", { id, fields: Object.keys(dataPatch) });
    await Event.update(id, {
      data: Object.keys(dataPatch).length > 0 ? dataPatch : undefined,
      tags: input.tags,
    });
  }

  export async function toPrompt(plan: Info, opts: ToPromptOptions = {}): Promise<string> {
    const options = ToPromptOptions.parse(opts);
    return renderContext(plan, options);
  }

  export async function listAsTree(opts: {
    source?: string;
    sourceId?: string;
  }): Promise<Event.TreeNode[]> {
    return Event.listTree({ ...opts, type: "plan" });
  }

  function serialize(event: Event.Info): Info {
    const d = event.data as PlanEventData;
    return {
      id: event.id,
      title: d.title,
      body: d.body,
      status: d.status as PlanStatus,
      authorType: d.authorType as AuthorType,
      tags: event.tags,
      data: event.data,
      source: event.source,
      sourceId: event.sourceId,
      createdBy: d.createdBy ?? null,
      parentEventId: event.parentEventId,
      timeCreated: event.timeCreated,
      timeUpdated: event.timeCreated,
    };
  }
}
