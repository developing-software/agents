import { command, query } from "$app/server";
import { z } from "zod";
import { AgentWorkflow, AgentCompat } from "@agents/core/agent";
import { GithubBranch } from "@agents/core/github/repo/branch";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { Plan } from "@agents/core/events/plan/index";
import { Repository } from "@agents/core/repository/index";
import { error } from "@sveltejs/kit";

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
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);
    return GithubBranch.list(repo);
  },
);

export const previewPrompt = query(z.object({ planId: z.string() }), async ({ planId }) => {
  const plan = await Plan.fromID(planId);
  if (!plan) error(404, `Plan ${planId} not found`);
  return Plan.toPrompt(plan);
});

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
  }),
  async ({ planId, organization, repoName, agents, ref }) => {
    const plan = await Plan.fromID(planId);
    if (!plan) error(404, `Plan ${planId} not found`);

    const prompt = await Plan.toPrompt(plan);
    const baseTags = [`plan:${planId}`, ...plan.tags];

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

export const dispatchFix = command(
  z.object({
    planId: z.string(),
    organization: z.string(),
    repoName: z.string(),
    prNumber: z.number(),
    reviewEventId: z.string(),
    review: z.object({
      verdict: z.string(),
      suggestions: z.array(z.string()).default([]),
    }),
    agent: z.object({
      harness: z.enum(AgentWorkflow.Agents),
      model: z.string().optional(),
    }),
    ref: z.string().default("dev"),
  }),
  async ({ planId, organization, repoName, prNumber, reviewEventId, review, agent, ref }) => {
    const plan = await Plan.fromID(planId);
    if (!plan) error(404, `Plan ${planId} not found`);

    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const pr = await GithubPullRequest.get(repoRef, prNumber);

    const planPrompt = await Plan.toPrompt(plan);
    const feedbackLines = [
      `\n## Review Feedback (PR #${prNumber})\n`,
      `**Verdict:** ${review.verdict}`,
    ];
    if (review.suggestions.length > 0) {
      feedbackLines.push(`\n**Issues to fix:**`);
      for (const s of review.suggestions) {
        feedbackLines.push(`- ${s}`);
      }
    }
    feedbackLines.push(
      `\nFix the issues identified in the review. The code is already on branch \`${pr.headBranch}\`.`,
      `Do NOT commit, push, or open a pull request — only modify the files.`,
    );
    const prompt = planPrompt + "\n" + feedbackLines.join("\n");

    const tags = [
      `plan:${planId}`,
      `parent:${reviewEventId}`,
      `gh:pr:${prNumber}`,
      ...plan.tags,
    ];

    await AgentWorkflow.dispatch({
      owner: organization,
      repo: repoName,
      agent: agent.harness,
      prompt,
      tags,
      model: agent.model,
      ref,
      branch: pr.headBranch,
    });

    return { harness: agent.harness, status: "dispatched", branch: pr.headBranch };
  },
);
