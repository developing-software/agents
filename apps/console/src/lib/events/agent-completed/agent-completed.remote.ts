import { query, command } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository";
import { Event } from "@agents/core/events";
import { AgentEvent } from "@agents/core/events/agent";
import { AgentMetrics } from "@agents/core/events/agent-metrics";
import { withCache, useCache } from "@agents/core/cache";
import { flattenChecks } from "../helpers";

const repoInput = z.object({ organization: z.string(), repoName: z.string() });

// --- Cached queries ---

export const getEventSummary = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return { data: null, cachedAt: null };

  return withCache({ key: "agent-summary", params: [repo.id], ttl: 120 }, async () => ({
    data: await AgentMetrics.summary(repo.id),
    cachedAt: new Date().toISOString(),
  }));
});

export const getAgentComparison = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return { data: [], cachedAt: null };

  return withCache({ key: "agent-comparison", params: [repo.id], ttl: 120 }, async () => ({
    data: await AgentMetrics.comparison(repo.id),
    cachedAt: new Date().toISOString(),
  }));
});

export const getAgentStats = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return { data: [], cachedAt: null };

  return withCache({ key: "agent-stats", params: [repo.id], ttl: 120 }, async () => ({
    data: await AgentMetrics.agentStats(repo.id),
    cachedAt: new Date().toISOString(),
  }));
});

// --- Cache invalidation commands ---

export const invalidateSummaryCache = command(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return;
  const cache = useCache();
  if (!cache) return;
  await cache.delete(`agent-summary:${repo.id}`);
});

export const invalidateComparisonCache = command(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return;
  const cache = useCache();
  if (!cache) return;
  await Promise.all([
    cache.delete(`agent-comparison:${repo.id}`),
    cache.delete(`agent-stats:${repo.id}`),
  ]);
});

// --- Unchanged queries (different pages/lifecycle) ---

export const getDashboardSummary = query(z.object({}), async () => {
  const repos = await Repository.list();
  if (repos.length === 0) return { global: null, repos: [] };

  const repoIds = repos.map((r) => r.id);
  const events = await Event.list({
    source: "repository",
    sourceIds: repoIds,
    type: "agent",
    limit: 500,
  });

  const repoById = new Map(repos.map((r) => [r.id, r]));

  const perRepo = new Map<
    string,
    {
      owner: string;
      repo: string;
      total: number;
      cost: number;
      passed: number;
      failed: number;
      lastActivity: string | null;
    }
  >();

  let totalRuns = 0;
  let totalDurationMs = 0;
  let durationCount = 0;
  let totalCost = 0;
  let totalTokens = 0;
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let globalPassed = 0;
  let globalFailed = 0;

  for (const e of events) {
    totalRuns++;
    if (!e.data) continue;

    const parsed = AgentEvent.Completed.parse(e.data);

    if (parsed.workflow.durationMs > 0) {
      totalDurationMs += parsed.workflow.durationMs;
      durationCount++;
    }

    if (parsed.diff) {
      totalLinesAdded += parsed.diff.linesAdded;
      totalLinesRemoved += parsed.diff.linesRemoved;
    }

    const metrics = parsed.agent.metrics;
    let eventCost = 0;
    if (metrics) {
      if (typeof metrics.cost_usd === "number") {
        totalCost += metrics.cost_usd;
        eventCost = metrics.cost_usd;
      }
      const tokens = metrics.tokens;
      for (const key of ["input", "output"] as const) {
        const val = tokens[key];
        if (typeof val === "number") totalTokens += val;
      }
    }

    const checks = flattenChecks(parsed.checks);
    for (const c of checks) {
      if (c.outcome === "success") globalPassed++;
      else globalFailed++;
    }

    const repo = e.sourceId ? repoById.get(e.sourceId) : undefined;
    if (repo) {
      const key = `${repo.owner}/${repo.repo}`;
      let entry = perRepo.get(key);
      if (!entry) {
        entry = {
          owner: repo.owner,
          repo: repo.repo,
          total: 0,
          cost: 0,
          passed: 0,
          failed: 0,
          lastActivity: null,
        };
        perRepo.set(key, entry);
      }
      entry.total++;
      entry.cost += eventCost;
      for (const c of checks) {
        if (c.outcome === "success") entry.passed++;
        else entry.failed++;
      }
      if (!entry.lastActivity || e.timeCreated > entry.lastActivity) {
        entry.lastActivity = e.timeCreated;
      }
    }
  }

  const globalTotal = globalPassed + globalFailed;

  return {
    global: {
      total: totalRuns,
      avgDurationMs: durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0,
      totalCost,
      totalTokens,
      totalLinesAdded,
      totalLinesRemoved,
      passRate: globalTotal > 0 ? Math.round((globalPassed / globalTotal) * 100) : 0,
    },
    repos: [...perRepo.values()]
      .map((r) => {
        const total = r.passed + r.failed;
        return {
          owner: r.owner,
          repo: r.repo,
          total: r.total,
          cost: r.cost,
          passRate: total > 0 ? Math.round((r.passed / total) * 100) : 0,
          lastActivity: r.lastActivity,
        };
      })
      .sort((a, b) => b.total - a.total),
  };
});

export const listAgentRuns = query(
  z.object({ organization: z.string(), repoName: z.string(), limit: z.number().default(50) }),
  async ({ organization, repoName, limit }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const events = await Event.list({
      type: "agent",
      source: "repository",
      sourceId: repo.id,
      limit,
    });

    return events.map((e) => {
      const parsed = AgentEvent.Completed.parse(e.data);
      const metrics = parsed.agent.metrics;
      const tokens = metrics?.tokens;
      const checks = flattenChecks(parsed.checks);

      return {
        id: e.id,
        parentEventId: e.parentEventId,
        agent: parsed.agent.name,
        model: metrics?.model ?? null,
        cost_usd: metrics?.cost_usd ?? null,
        input_tokens: tokens?.input ?? null,
        output_tokens: tokens?.output ?? null,
        reasoning_tokens: tokens?.reasoning ?? null,
        cache_read_tokens: tokens?.cache_read ?? null,
        cache_creation_tokens: tokens?.cache_creation ?? null,
        turns: metrics?.turns ?? null,
        durationMs: parsed.workflow.durationMs || null,
        linesAdded: parsed.diff?.linesAdded ?? null,
        linesRemoved: parsed.diff?.linesRemoved ?? null,
        prUrl: parsed.pr?.url || null,
        runUrl: parsed.workflow.runUrl || null,
        agentStatus: parsed.agent.status ?? null,
        conclusion: parsed.workflow.conclusion ?? null,
        provider: parsed.agent.pricing?.provider ?? null,
        pricing_heuristic: parsed.agent.pricing?.heuristic ?? null,
        checks,
        origin: e.origin,
        tags: e.tags,
        timeCreated: e.timeCreated,
      };
    });
  },
);
