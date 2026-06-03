import { command, query } from "$app/server";
import { z } from "zod";
import { AgentWorkflow, AgentCompat } from "@agents/core/agent";
import { getProvider } from "@agents/core/git";
import { Plan } from "@agents/core/events/plan";
import { error } from "@sveltejs/kit";
import { withRequestRepoActor } from "$lib/server/repository.server";
import { repoQuery } from "$lib/remote";

export const listAgentConfigs = query(z.object({}), async () => {
  return AgentWorkflow.Agents.map((id) => {
    const cfg = AgentCompat.config[id];
    return {
      id,
      label: cfg.label,
      multiProvider: cfg.providers.length > 1,
      defaultModel: cfg.defaultModel,
    };
  });
});

export const listFeaturedModels = query(
  z.object({ agent: z.enum(AgentWorkflow.Agents) }),
  async ({ agent }) => AgentCompat.featuredModels(agent),
);

export const searchAgentModels = query(
  z.object({ agent: z.enum(AgentWorkflow.Agents), search: z.string().optional() }),
  async ({ agent, search }) => {
    const models = await AgentCompat.allModels(agent);
    if (!search) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.family?.toLowerCase().includes(q) ||
        m.providerId.toLowerCase().includes(q),
    );
  },
);

export const listBranches = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) =>
    withRequestRepoActor({ organization, repoName }, async (repo) =>
      getProvider(repo.source).branches.list(repo.fullName),
    ),
);

export const previewPrompt = repoQuery(
  {
    planId: z.string(),
    options: Plan.ToPromptOptions.optional(),
  },
  async ({ planId, options }) => {
    const plan = await Plan.fromID(planId);
    if (!plan) error(404, `Plan ${planId} not found`);
    return {
      prompt: await Plan.toPrompt(plan, options),
      tags: Plan.extensionTags(options),
    };
  },
);

export const previewFixPrompt = query(
  z.object({
    planId: z.string(),
    prNumber: z.number(),
    organization: z.string(),
    repoName: z.string(),
    reviewVerdict: z.string(),
    reviewSuggestions: z.array(z.string()).default([]),
  }),
  async ({ planId, prNumber, organization, repoName, reviewVerdict, reviewSuggestions }) => {
    const plan = await Plan.fromID(planId);
    if (!plan) error(404, `Plan ${planId} not found`);

    return withRequestRepoActor({ organization, repoName }, async (repo) => {
      const pr = await getProvider(repo.source).pulls.get(repo.fullName, prNumber);
      if (!pr) error(404, `Pull request #${prNumber} not found`);

      const planPrompt = await Plan.toPrompt(plan);
      return {
        prompt: buildFixPrompt(planPrompt, prNumber, reviewVerdict, reviewSuggestions),
        branch: pr.headBranch,
      };
    });
  },
);

function buildFixPrompt(
  base: string,
  prNumber: number,
  verdict: string,
  suggestions: string[],
): string {
  const lines = [`\n## Review Feedback (PR #${prNumber})\n`, `**Verdict:** ${verdict}`];
  if (suggestions.length > 0) {
    lines.push(`\n**Issues to fix:**`);
    for (const s of suggestions) lines.push(`- ${s}`);
  }
  lines.push(
    `\nFix the issues identified in the review.`,
    `Do NOT commit, push, or open a pull request — only modify the files.`,
  );
  return base + "\n" + lines.join("\n");
}

export const dispatch = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    prompt: z.string(),
    agents: z.array(
      z.object({
        harness: z.enum(AgentWorkflow.Agents),
        model: z.string().optional(),
        prompt: z.string().optional(),
      }),
    ),
    ref: z.string().default("dev"),
    tags: z.array(z.string()).default([]),
    branch: z.string().optional(),
  }),
  async ({ organization, repoName, prompt, agents, ref, tags, branch }) => {
    return withRequestRepoActor({ organization, repoName }, async () => {
      const results: { harness: string; status: string }[] = [];

      for (const agent of agents) {
        await AgentWorkflow.dispatch({
          owner: organization,
          repo: repoName,
          agent: agent.harness,
          prompt: agent.prompt ?? prompt,
          tags,
          model: agent.model,
          ref,
          branch,
        });
        results.push({ harness: agent.harness, status: "dispatched" });
      }

      return results;
    });
  },
);
