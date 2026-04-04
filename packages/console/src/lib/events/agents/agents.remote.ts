import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { Event } from "@agents/core/events/index";
import { AgentEvent } from "@agents/core/events/agent";
import { flattenChecks } from "../helpers";

const repoInput = z.object({ organization: z.string(), repoName: z.string() });

export const getAgentStats = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];

  const events = await Event.list({
    type: "agent.completed",
    source: "repository",
    sourceId: repo.id,
    limit: 200,
  });

  const agents = new Map<
    string,
    {
      agent: string;
      count: number;
      totalDurationMs: number;
      durationCount: number;
      checks: Map<string, { category: string; name: string; passed: number; failed: number }>;
    }
  >();

  for (const e of events) {
    if (!e.data) continue;
    const parsed = AgentEvent.Completed.parse(e.data);
    const agent = parsed.agent.name;

    let entry = agents.get(agent);
    if (!entry) {
      entry = { agent, count: 0, totalDurationMs: 0, durationCount: 0, checks: new Map() };
      agents.set(agent, entry);
    }
    entry.count++;

    if (parsed.workflow.durationMs > 0) {
      entry.totalDurationMs += parsed.workflow.durationMs;
      entry.durationCount++;
    }

    const checks = flattenChecks(parsed.checks);
    for (const c of checks) {
      const key = `${c.category}/${c.name}`;
      let stat = entry.checks.get(key);
      if (!stat) {
        stat = { category: c.category, name: c.name, passed: 0, failed: 0 };
        entry.checks.set(key, stat);
      }
      if (c.outcome === "success") stat.passed++;
      else stat.failed++;
    }
  }

  return [...agents.values()]
    .map((a) => ({
      agent: a.agent,
      count: a.count,
      avgDurationMs: a.durationCount > 0 ? Math.round(a.totalDurationMs / a.durationCount) : 0,
      checks: [...a.checks.values()],
    }))
    .sort((a, b) => b.count - a.count);
});

interface Totals {
  total: number;
  count: number;
}

function addToTotals(t: Totals, val: number | null | undefined): void {
  if (typeof val === "number") {
    t.total += val;
    t.count++;
  }
}

function totals(): Totals {
  return { total: 0, count: 0 };
}

export const getAgentComparison = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];

  const events = await Event.list({
    type: "agent.completed",
    source: "repository",
    sourceId: repo.id,
    limit: 500,
  });

  const agents = new Map<
    string,
    {
      agent: string;
      count: number;
      cost: Totals;
      tokens: { input: Totals; output: Totals; cache: Totals };
      turns: Totals;
      models: Record<string, number>;
      lastSeen: string;
    }
  >();

  for (const e of events) {
    const parsed = AgentEvent.Completed.parse(e.data);
    const agent = parsed.agent.name;

    let entry = agents.get(agent);
    if (!entry) {
      entry = {
        agent,
        count: 0,
        cost: totals(),
        tokens: { input: totals(), output: totals(), cache: totals() },
        turns: totals(),
        models: {},
        lastSeen: e.timeCreated,
      };
      agents.set(agent, entry);
    }
    entry.count++;
    if (e.timeCreated > entry.lastSeen) entry.lastSeen = e.timeCreated;

    const metrics = parsed.agent.metrics;
    if (metrics) {
      addToTotals(entry.cost, metrics.cost_usd);
      addToTotals(entry.tokens.input, metrics.tokens.input);
      addToTotals(entry.tokens.output, metrics.tokens.output);
      addToTotals(entry.turns, metrics.turns);

      const cacheVal =
        (metrics.tokens.cache_read ?? 0) + (metrics.tokens.cache_creation ?? 0);
      if (metrics.tokens.cache_read != null || metrics.tokens.cache_creation != null) {
        entry.tokens.cache.total += cacheVal;
        entry.tokens.cache.count++;
      }

      if (metrics.model) {
        entry.models[metrics.model] = (entry.models[metrics.model] ?? 0) + 1;
      }
    }
  }

  return [...agents.values()]
    .map((a) => ({
      ...a,
      models: Object.entries(a.models).sort((x, y) => y[1] - x[1]) as [string, number][],
    }))
    .sort((a, b) => b.count - a.count);
});

export const getEventSummary = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo)
    return {
      total: 0,
      byAgent: [] as [string, number][],
      totalCost: 0,
      totalTokens: 0,
      checks: [] as { category: string; name: string; passed: number; failed: number }[],
      avgDurationMs: 0,
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
    };

  const events = await Event.list({
    type: "agent.completed",
    source: "repository",
    sourceId: repo.id,
    limit: 200,
  });

  const agentCounts: Record<string, number> = {};
  const checkStats = new Map<
    string,
    { category: string; name: string; passed: number; failed: number }
  >();
  let totalDurationMs = 0;
  let durationCount = 0;
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let totalCost = 0;
  let totalTokens = 0;

  for (const e of events) {
    if (!e.data) continue;
    const parsed = AgentEvent.Completed.parse(e.data);

    const agent = parsed.agent.name;
    agentCounts[agent] = (agentCounts[agent] ?? 0) + 1;

    if (parsed.workflow.durationMs > 0) {
      totalDurationMs += parsed.workflow.durationMs;
      durationCount++;
    }

    if (parsed.diff) {
      totalLinesAdded += parsed.diff.linesAdded;
      totalLinesRemoved += parsed.diff.linesRemoved;
    }

    const metrics = parsed.agent.metrics;
    if (metrics) {
      if (typeof metrics.cost_usd === "number") totalCost += metrics.cost_usd;
      if (typeof metrics.tokens.input === "number") totalTokens += metrics.tokens.input;
      if (typeof metrics.tokens.output === "number") totalTokens += metrics.tokens.output;
    }

    const checks = flattenChecks(parsed.checks);
    for (const c of checks) {
      const key = `${c.category}/${c.name}`;
      let stat = checkStats.get(key);
      if (!stat) {
        stat = { category: c.category, name: c.name, passed: 0, failed: 0 };
        checkStats.set(key, stat);
      }
      if (c.outcome === "success") stat.passed++;
      else stat.failed++;
    }
  }

  return {
    total: events.length,
    byAgent: Object.entries(agentCounts).sort((a, b) => b[1] - a[1]) as [string, number][],
    totalCost,
    totalTokens,
    checks: [...checkStats.values()],
    avgDurationMs: durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0,
    totalLinesAdded,
    totalLinesRemoved,
  };
});

export const getDashboardSummary = query(z.object({}), async () => {
  const repos = await Repository.list();
  if (repos.length === 0) return { global: null, repos: [] };

  const repoIds = repos.map((r) => r.id);
  const events = await Event.list({
    source: "repository",
    sourceIds: repoIds,
    type: "agent.completed",
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
      type: "agent.completed",
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
