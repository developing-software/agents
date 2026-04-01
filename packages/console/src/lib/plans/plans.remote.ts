import { command, query } from "$app/server";
import { z } from "zod";
import { Plan } from "@agents/core/plan/index";
import { Repository } from "@agents/core/repository/index";
import type { PlanStatus } from "./plan-helpers";

export const listPlans = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
  }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];
    return Plan.list({ source: "repository", sourceId: repo.id });
  },
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
    const id = await Plan.create({
      title,
      body,
      authorType,
      tags,
      source: "repository",
      sourceId: repoId,
    });
    return { id };
  },
);

export const updatePlan = command(
  z.object({
    id: z.string(),
    title: z.string().optional(),
    body: z.string().optional(),
    status: z.enum(["draft", "review", "approved", "implementing", "completed", "rejected"]).optional(),
    tags: z.array(z.string()).optional(),
  }),
  async ({ id, ...input }) => {
    await Plan.update(id, input);
  },
);
