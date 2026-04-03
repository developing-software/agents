import { command, query } from "$app/server";
import { z } from "zod";
import { generateText, Output } from "ai";
import { Repository } from "@agents/core/repository/index";
import { Event } from "@agents/core/events/index";
import { Plan } from "@agents/core/plan/index";
import { PlanJudge } from "@agents/core/plan/judge";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { createModel } from "./model";
import { flattenChecks } from "$lib/events/event-helpers";

// -- Helpers --

function extractPrNumber(tags: string[]): number | null {
  for (const tag of tags) {
    const match = tag.match(/^gh:pr:(\d+)$/);
    if (match) return parseInt(match[1]!, 10);
  }
  return null;
}

interface PlanRun {
  id: string;
  agent: string;
  model: string | null;
  prNumber: number | null;
  prState: string | null;
  prUrl: string | null;
  runUrl: string | null;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  turns: number | null;
  durationMs: number | null;
  linesAdded: number | null;
  linesRemoved: number | null;
  checks: Array<{ category: string; name: string; outcome: string }>;
  tags: string[];
  timeCreated: string;
}

// -- Queries --

export const listPlanRuns = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    planId: z.string(),
  }),
  async ({ organization, repoName, planId }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return { runs: [], reviews: {} as Record<number, PlanJudge.ReviewResult>, judgment: null as PlanJudge.CompareResult | null };

    const tags = [`plan:${planId}`];

    // Fetch agent.completed events for this plan
    const events = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, tags, limit: 20 });

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };

    // Build runs from agent.completed events
    const runs: PlanRun[] = [];
    for (const e of events) {
      const d = e.data as Record<string, unknown> | undefined;
      const agentMeta = d?.agent as Record<string, unknown> | undefined;
      const m = agentMeta?.metrics as Record<string, unknown> | undefined;
      const tokens = m?.tokens as Record<string, unknown> | undefined;
      const diffMeta = d?.diff as Record<string, unknown> | undefined;
      const prMeta = d?.pr as Record<string, unknown> | undefined;
      const workflow = d?.workflow as Record<string, unknown> | undefined;
      const checks = flattenChecks(d?.checks);

      const prNumber = typeof prMeta?.number === "number" ? prMeta.number : extractPrNumber(e.tags);

      // Get live PR state
      let prState: string | null = null;
      if (prNumber) {
        try {
          const pr = await GithubPullRequest.get(repoRef, prNumber);
          prState = pr.state;
        } catch {
          prState = null;
        }
      }

      runs.push({
        id: e.id,
        agent: typeof agentMeta?.name === "string" ? agentMeta.name : "unknown",
        model: typeof m?.model === "string" ? m.model : null,
        prNumber,
        prState,
        prUrl: typeof prMeta?.url === "string" ? prMeta.url : null,
        runUrl: typeof workflow?.runUrl === "string" ? workflow.runUrl : null,
        cost_usd: typeof m?.cost_usd === "number" ? m.cost_usd : null,
        input_tokens: typeof tokens?.input === "number" ? tokens.input : null,
        output_tokens: typeof tokens?.output === "number" ? tokens.output : null,
        turns: typeof m?.turns === "number" ? m.turns : null,
        durationMs: typeof workflow?.durationMs === "number" ? workflow.durationMs : null,
        linesAdded: typeof diffMeta?.linesAdded === "number" ? diffMeta.linesAdded : null,
        linesRemoved: typeof diffMeta?.linesRemoved === "number" ? diffMeta.linesRemoved : null,
        checks,
        tags: e.tags,
        timeCreated: e.timeCreated,
      });
    }

    // Fetch existing reviews and judgment
    const reviewEvents = await Event.list({ type: "github.pull_request.reviewed", source: "repository", sourceId: repo.id, tags, limit: 20 });
    const judgmentEvents = await Event.list({ type: "plan.evaluated", source: "repository", sourceId: repo.id, tags, limit: 1 });

    const reviews: Record<number, PlanJudge.ReviewResult> = {};
    for (const re of reviewEvents) {
      const rd = re.data as Record<string, unknown>;
      const prNum = typeof rd.prNumber === "number" ? rd.prNumber : null;
      if (prNum != null) {
        const parsed = PlanJudge.ReviewResult.safeParse(rd);
        if (parsed.success) reviews[prNum] = parsed.data;
      }
    }

    let judgment: PlanJudge.CompareResult | null = null;
    if (judgmentEvents.length > 0) {
      const parsed = PlanJudge.CompareResult.safeParse(judgmentEvents[0]!.data);
      if (parsed.success) judgment = parsed.data;
    }

    return { runs, reviews, judgment };
  },
);

// -- Commands --

export const reviewPR = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    planId: z.string(),
    agent: z.string(),
    prNumber: z.number(),
    checks: z.array(z.object({ category: z.string(), name: z.string(), outcome: z.string() })),
    metrics: z.object({
      cost_usd: z.number().nullable(),
      durationMs: z.number().nullable(),
      linesAdded: z.number().nullable(),
      linesRemoved: z.number().nullable(),
    }),
  }),
  async ({ organization, repoName, planId, agent, prNumber, checks, metrics }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) throw new Error("Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const diff = await GithubPullRequest.getDiff(repoRef, prNumber);

    const prompt = PlanJudge.composeReviewPrompt({ agent, prNumber, diff, checks, metrics });

    const result = await generateText({
      model: createModel(),
      output: Output.object({ schema: PlanJudge.ReviewResult }),
      prompt,
    });

    const review = result.output;

    await Event.create({
      type: "github.pull_request.reviewed",
      origin: "console",
      source: "repository",
      sourceId: repo.id,
      tags: [`plan:${planId}`, `gh:pr:${prNumber}`],
      data: review as Record<string, unknown>,
    });

    return review;
  },
);

export const judgePlan = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    planId: z.string(),
    runs: z.array(
      z.object({
        agent: z.string(),
        prNumber: z.number(),
        checks: z.array(z.object({ category: z.string(), name: z.string(), outcome: z.string() })),
        metrics: z.object({
          cost_usd: z.number().nullable(),
          durationMs: z.number().nullable(),
          linesAdded: z.number().nullable(),
          linesRemoved: z.number().nullable(),
        }),
      }),
    ),
  }),
  async ({ organization, repoName, planId, runs }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) throw new Error("Repository not found");

    const plan = await Plan.fromID(planId);
    if (!plan) throw new Error("Plan not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };

    // Fetch all diffs in parallel
    const implementations = await Promise.all(
      runs.map(async (run) => ({
        ...run,
        diff: await GithubPullRequest.getDiff(repoRef, run.prNumber),
      })),
    );

    const prompt = PlanJudge.composeComparePrompt({ plan, implementations });

    const result = await generateText({
      model: createModel(),
      output: Output.object({ schema: PlanJudge.CompareResult }),
      prompt,
    });

    const judgment = result.output;

    await Event.create({
      type: "plan.evaluated",
      origin: "console",
      source: "repository",
      sourceId: repo.id,
      tags: [`plan:${planId}`],
      data: judgment as Record<string, unknown>,
    });

    return judgment;
  },
);

export const mergeWinner = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    planId: z.string(),
    winnerPrNumber: z.number(),
    loserPrNumbers: z.array(z.number()),
  }),
  async ({ organization, repoName, planId, winnerPrNumber, loserPrNumbers }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) throw new Error("Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };

    const mergeResult = await GithubPullRequest.merge(repoRef, winnerPrNumber);

    for (const prNumber of loserPrNumbers) {
      await GithubPullRequest.close(repoRef, prNumber);
    }

    await Plan.update(planId, { status: "completed" });

    await Event.create({
      type: "plan.completed",
      origin: "console",
      source: "repository",
      sourceId: repo.id,
      tags: [`plan:${planId}`, `gh:pr:${winnerPrNumber}`],
      data: {
        winnerPr: winnerPrNumber,
        winnerAgent: null,
        closedPrs: loserPrNumbers,
      },
    });

    return { merged: winnerPrNumber, closed: loserPrNumbers, message: mergeResult.message };
  },
);
