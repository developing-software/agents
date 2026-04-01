import { command, query } from "$app/server";
import { z } from "zod";
import { AgentWorkflow } from "@agents/core/agent";
import { Plan } from "@agents/core/plan/index";
import { toPrompt } from "@agents/core/plan/prompt";
import { Repository } from "@agents/core/repository/index";
import { error } from "@sveltejs/kit";

export const previewPrompt = query(
  z.object({ planId: z.string() }),
  async ({ planId }) => {
    return toPrompt(planId);
  },
);

export const dispatchPlan = command(
  z.object({
    planId: z.string(),
    organization: z.string(),
    repoName: z.string(),
    agents: z.array(
      z.object({
        harness: z.enum(AgentWorkflow.Agents),
        model: z.string().optional(),
      }),
    ),
    ref: z.string().default("dev"),
    extraTags: z.array(z.string()).optional(),
  }),
  async ({ planId, organization, repoName, agents, ref, extraTags }) => {
    const plan = await Plan.fromID(planId);
    if (!plan) error(404, `Plan ${planId} not found`);

    const prompt = await toPrompt(planId);
    const baseTags = [`plan:${planId}`, ...plan.tags, ...(extraTags ?? [])];

    const results: { harness: string; status: string }[] = [];

    for (const agent of agents) {
      await AgentWorkflow.dispatch({
        owner: organization,
        repo: repoName,
        agent: agent.harness,
        prompt,
        tags: baseTags,
        model: agent.model,
        ref,
      });
      results.push({ harness: agent.harness, status: "dispatched" });
    }

    await Plan.update(planId, {
      status: "implementing",
      data: {
        ...plan.data,
        dispatched: agents.map((a) => ({
          harness: a.harness,
          model: a.model,
          timestamp: new Date().toISOString(),
        })),
      },
    });

    return results;
  },
);
