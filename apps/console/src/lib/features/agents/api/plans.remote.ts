import { command, query } from "$app/server";
import { z } from "zod";
import { Plan } from "@agents/core/events/plan";
import { error } from "@sveltejs/kit";
import { getRequestEvent } from "$app/server";
import { withRequestRepoActor } from "$lib/server/repository.server";
import type { PlanStatus } from "../plans/plan-helpers";

export const listPlans = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
  }),
  async ({ organization, repoName }) =>
    withRequestRepoActor({ organization, repoName }, async (repo) =>
      Plan.list({ source: "repository", sourceId: repo.id }),
    ),
);

export const createPlan = command(
  z.object({
    title: z.string(),
    body: z.string(),
    authorType: z.enum(["human", "llm"]),
    tags: z.array(z.string()).default([]),
    repoId: z.string(),
  }),
  async ({ title, body, authorType, tags, repoId }) => {
    const event = getRequestEvent();
    return withRequestRepoActor(
      {
        organization: event.params.org ?? error(500, "Missing org parameter"),
        repoName: event.params.repo ?? error(500, "Missing repo parameter"),
        provider: event.params.provider,
      },
      async (repo) => {
        if (repo.id !== repoId) error(404, "Repository not found");
        const id = await Plan.create({
          title,
          body,
          authorType,
          tags,
          source: "repository",
          sourceId: repo.id,
        });
        return { id };
      },
    );
  },
);

export const createSubPlan = command(
  z.object({
    parentEventId: z.string(),
    title: z.string(),
    body: z.string(),
    source: z.string(),
    sourceId: z.string(),
    tags: z.array(z.string()).default([]),
  }),
  async (input) => {
    const id = await Plan.create({
      ...input,
      authorType: "human",
      status: "draft",
    });
    return { id };
  },
);

export const updatePlan = command(
  z.object({
    id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    status: z
      .enum(["draft", "review", "approved", "implementing", "completed", "rejected"])
      .optional(),
    tags: z.array(z.string()).optional(),
  }),
  async ({ id, ...input }) => {
    await Plan.update(id, input);
  },
);
