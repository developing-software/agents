import { command, query } from "$app/server";
import { z } from "zod";
import { generateText, Output } from "ai";
import { Repository } from "@agents/core/repository/index";
import { Event } from "@agents/core/events/index";
import { AgentEvent } from "@agents/core/events/agent";
import { Plan } from "@agents/core/events/plan/index";
import { PlanJudge } from "@agents/core/events/plan/judge";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { createModel } from "./model";
import { flattenChecks } from "$lib/events/helpers";

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
    if (!repo)
      return {
        runs: [],
        reviews: {} as Record<number, PlanJudge.ReviewResult>,
        judgment: null as PlanJudge.CompareResult | null,
      };

    const tags = [`plan:${planId}`];

    // Fetch events and reviews/judgment in parallel (all DB queries)
    const [events, reviewEvents, judgmentEvents] = await Promise.all([
      Event.list({
        type: "agent",
        source: "repository",
        sourceId: repo.id,
        tags,
        limit: 20,
      }),
      Event.list({
        type: "github.pull_request.reviewed",
        source: "repository",
        sourceId: repo.id,
        tags,
        limit: 20,
      }),
      Event.list({
        type: "plan.evaluated",
        source: "repository",
        sourceId: repo.id,
        tags,
        limit: 1,
      }),
    ]);

    // Build runs from agent events (no I/O, just parsing)
    const runs: PlanRun[] = events.map((e) => {
      const parsed = AgentEvent.Completed.parse(e.data);
      const metrics = parsed.agent.metrics;
      const tokens = metrics?.tokens;
      const checks = flattenChecks(parsed.checks);
      const prNumber = extractPrNumber(e.tags);

      return {
        id: e.id,
        agent: parsed.agent.name,
        model: metrics?.model ?? null,
        prNumber,
        prState: null,
        prUrl: parsed.pr?.url || null,
        runUrl: parsed.workflow.runUrl || null,
        cost_usd: metrics?.cost_usd ?? null,
        input_tokens: tokens?.input ?? null,
        output_tokens: tokens?.output ?? null,
        turns: metrics?.turns ?? null,
        durationMs: parsed.workflow.durationMs || null,
        linesAdded: parsed.diff?.linesAdded ?? null,
        linesRemoved: parsed.diff?.linesRemoved ?? null,
        checks,
        tags: e.tags,
        timeCreated: e.timeCreated,
      };
    });

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

export const listPrStates = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    prNumbers: z.array(z.number()),
  }),
  async ({ organization, repoName, prNumbers }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return {} as Record<number, string | null>;

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };

    const results = await Promise.all(
      prNumbers.map(async (prNumber) => {
        try {
          const pr = await GithubPullRequest.get(repoRef, prNumber);
          return { prNumber, state: pr.state };
        } catch {
          return { prNumber, state: null };
        }
      }),
    );

    const states: Record<number, string | null> = {};
    for (const { prNumber, state } of results) {
      states[prNumber] = state;
    }
    return states;
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

    const plan = await Plan.fromID(planId);
    if (!plan) throw new Error("Plan not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const diff = await GithubPullRequest.getDiff(repoRef, prNumber);

    const prompt = PlanJudge.composeReviewPrompt({ plan, agent, prNumber, diff, checks, metrics });

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
    reviews: z.array(PlanJudge.ReviewResult),
  }),
  async ({ organization, repoName, planId, reviews }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) throw new Error("Repository not found");

    const plan = await Plan.fromID(planId);
    if (!plan) throw new Error("Plan not found");

    const prompt = PlanJudge.composeComparePrompt({ plan, reviews });

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
