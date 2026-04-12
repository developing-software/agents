import { Event } from "./index";
import { AgentEvent } from "./agent/index";

function flattenChecks(
  raw: Record<string, Record<string, { outcome: string }>> | undefined,
): Array<{ category: string; name: string; outcome: string }> {
  if (!raw) return [];
  const result: Array<{ category: string; name: string; outcome: string }> = [];
  for (const [category, names] of Object.entries(raw)) {
    for (const [name, checkData] of Object.entries(names)) {
      result.push({ category, name, outcome: checkData.outcome });
    }
  }
  return result;
}

export namespace AgentMetrics {
  export interface SummaryResult {
    total: number;
    byAgent: [string, number][];
    totalCost: number;
    totalTokens: number;
    checks: { category: string; name: string; passed: number; failed: number }[];
    avgDurationMs: number;
    totalLinesAdded: number;
    totalLinesRemoved: number;
    workflowSuccess: number;
    workflowFailure: number;
    workflowCancelled: number;
  }

  export async function summary(repoId: string, limit = 200): Promise<SummaryResult> {
    const events = await Event.list({
      type: "agent",
      source: "repository",
      sourceId: repoId,
      limit,
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
    let workflowSuccess = 0;
    let workflowFailure = 0;
    let workflowCancelled = 0;

    for (const e of events) {
      if (!e.data) continue;
      const parsed = AgentEvent.Completed.parse(e.data);

      const agent = parsed.agent.name;
      agentCounts[agent] = (agentCounts[agent] ?? 0) + 1;

      const conclusion = parsed.workflow.conclusion;
      if (conclusion === "success") workflowSuccess++;
      else if (conclusion === "failure") workflowFailure++;
      else if (conclusion === "cancelled") workflowCancelled++;

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
      workflowSuccess,
      workflowFailure,
      workflowCancelled,
    };
  }

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

  export interface ComparisonAgent {
    agent: string;
    count: number;
    cost: Totals;
    tokens: { input: Totals; output: Totals; cache: Totals };
    turns: Totals;
    models: [string, number][];
    providers: [string, number][];
    costReported: number;
    costEstimated: number;
    lastSeen: string;
  }

  export async function comparison(repoId: string, limit = 500): Promise<ComparisonAgent[]> {
    const events = await Event.list({
      type: "agent",
      source: "repository",
      sourceId: repoId,
      limit,
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
        providers: Record<string, number>;
        costReported: number;
        costEstimated: number;
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
          providers: {},
          costReported: 0,
          costEstimated: 0,
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

        const cacheVal = (metrics.tokens.cache_read ?? 0) + (metrics.tokens.cache_creation ?? 0);
        if (metrics.tokens.cache_read != null || metrics.tokens.cache_creation != null) {
          entry.tokens.cache.total += cacheVal;
          entry.tokens.cache.count++;
        }

        if (metrics.model) {
          entry.models[metrics.model] = (entry.models[metrics.model] ?? 0) + 1;
        }
      }

      const pricing = parsed.agent.pricing;
      if (pricing) {
        if (pricing.provider) {
          entry.providers[pricing.provider] = (entry.providers[pricing.provider] ?? 0) + 1;
        }
        if (typeof metrics?.cost_usd === "number") {
          if (pricing.heuristic === "agent-reported") entry.costReported += metrics.cost_usd;
          else entry.costEstimated += metrics.cost_usd;
        }
      }
    }

    return [...agents.values()]
      .map((a) => ({
        ...a,
        models: Object.entries(a.models).sort((x, y) => y[1] - x[1]) as [string, number][],
        providers: Object.entries(a.providers).sort((x, y) => y[1] - x[1]) as [string, number][],
      }))
      .sort((a, b) => b.count - a.count);
  }

  export interface AgentStatsEntry {
    agent: string;
    count: number;
    avgDurationMs: number;
    checks: { category: string; name: string; passed: number; failed: number }[];
  }

  export async function agentStats(repoId: string, limit = 200): Promise<AgentStatsEntry[]> {
    const events = await Event.list({
      type: "agent",
      source: "repository",
      sourceId: repoId,
      limit,
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
  }
}
