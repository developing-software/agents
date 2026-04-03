import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { Event } from "@agents/core/events/index";
import { flattenChecks } from "./event-helpers";

const input = z.object({
  organization: z.string(),
  repoName: z.string(),
  tags: z.array(z.string()).default([]),
  limit: z.number().default(30),
});

export const listEvents = query(input, async ({ organization, repoName, tags, limit }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.list({ source: "repository", sourceId: repo.id, tags, limit });
});

export const listTree = query(input, async ({ organization, repoName, tags }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return Event.listTree({ source: "repository", sourceId: repo.id, tags });
});

export const getEventDetail = query(
  z.object({ eventId: z.string() }),
  async ({ eventId }) => {
    return Event.fromID(eventId);
  },
);

export const getAgentStats = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const events = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, limit: 200 });

    const agents = new Map<string, {
      agent: string;
      count: number;
      totalDurationMs: number;
      durationCount: number;
      checks: Map<string, { category: string; name: string; passed: number; failed: number }>;
    }>();

    for (const e of events) {
      const d = e.data as Record<string, unknown> | undefined;
      if (!d) continue;
      const agentMeta = d.agent as Record<string, unknown> | undefined;
      const workflow = d.workflow as Record<string, unknown> | undefined;
      const agent = typeof agentMeta?.name === 'string' ? agentMeta.name : 'unknown';

      let entry = agents.get(agent);
      if (!entry) {
        entry = { agent, count: 0, totalDurationMs: 0, durationCount: 0, checks: new Map() };
        agents.set(agent, entry);
      }
      entry.count++;

      if (typeof workflow?.durationMs === 'number') {
        entry.totalDurationMs += workflow.durationMs;
        entry.durationCount++;
      }

      const checks = flattenChecks(d.checks);
      for (const c of checks) {
        const key = `${c.category}/${c.name}`;
        let stat = entry.checks.get(key);
        if (!stat) {
          stat = { category: c.category, name: c.name, passed: 0, failed: 0 };
          entry.checks.set(key, stat);
        }
        if (c.outcome === 'success') stat.passed++;
        else stat.failed++;
      }
    }

    return [...agents.values()].map((a) => ({
      agent: a.agent,
      count: a.count,
      avgDurationMs: a.durationCount > 0 ? Math.round(a.totalDurationMs / a.durationCount) : 0,
      checks: [...a.checks.values()],
    })).sort((a, b) => b.count - a.count);
  },
);

export const getAgentComparison = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const events = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, limit: 500 });

    const TOKEN_KEYS = ['input', 'output', 'reasoning', 'cache_read', 'cache_creation'] as const;
    const agents = new Map<string, {
      agent: string;
      count: number;
      sums: Record<string, number>;
      counts: Record<string, number>;
      models: Record<string, number>;
      lastSeen: string;
    }>();

    for (const e of events) {
      const d = e.data as Record<string, unknown> | undefined;
      const agentMeta = d?.agent as Record<string, unknown> | undefined;
      const agent = typeof agentMeta?.name === 'string' ? agentMeta.name : 'unknown';

      let entry = agents.get(agent);
      if (!entry) {
        entry = { agent, count: 0, sums: {}, counts: {}, models: {}, lastSeen: e.timeCreated };
        agents.set(agent, entry);
      }
      entry.count++;
      if (e.timeCreated > entry.lastSeen) entry.lastSeen = e.timeCreated;

      const m = agentMeta?.metrics;
      if (m && typeof m === 'object') {
        const obj = m as Record<string, unknown>;
        const tokens = obj.tokens as Record<string, unknown> | undefined;
        if (tokens && typeof tokens === 'object') {
          for (const key of TOKEN_KEYS) {
            const val = tokens[key];
            if (typeof val === 'number') {
              entry.sums[key] = (entry.sums[key] ?? 0) + val;
              entry.counts[key] = (entry.counts[key] ?? 0) + 1;
            }
          }
        }
        for (const key of ['turns', 'cost_usd'] as const) {
          const val = obj[key];
          if (typeof val === 'number') {
            entry.sums[key] = (entry.sums[key] ?? 0) + val;
            entry.counts[key] = (entry.counts[key] ?? 0) + 1;
          }
        }
        const model = obj.model;
        if (typeof model === 'string') {
          entry.models[model] = (entry.models[model] ?? 0) + 1;
        }
      }
    }

    return [...agents.values()].sort((a, b) => b.count - a.count);
  },
);

export const listAgentRuns = query(
  z.object({ organization: z.string(), repoName: z.string(), limit: z.number().default(50) }),
  async ({ organization, repoName, limit }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const events = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, limit });

    return events.map((e) => {
      const d = e.data as Record<string, unknown> | undefined;
      const agentMeta = d?.agent as Record<string, unknown> | undefined;
      const m = agentMeta?.metrics as Record<string, unknown> | undefined;
      const tokens = m?.tokens as Record<string, unknown> | undefined;
      const diffMeta = d?.diff as Record<string, unknown> | undefined;
      const prMeta = d?.pr as Record<string, unknown> | undefined;
      const workflow = d?.workflow as Record<string, unknown> | undefined;
      const checks = flattenChecks(d?.checks);

      return {
        id: e.id,
        parentEventId: e.parentEventId,
        agent: typeof agentMeta?.name === 'string' ? agentMeta.name : 'unknown',
        model: typeof m?.model === 'string' ? m.model : null,
        cost_usd: typeof m?.cost_usd === 'number' ? m.cost_usd : null,
        input_tokens: typeof tokens?.input === 'number' ? tokens.input : null,
        output_tokens: typeof tokens?.output === 'number' ? tokens.output : null,
        reasoning_tokens: typeof tokens?.reasoning === 'number' ? tokens.reasoning : null,
        cache_read_tokens: typeof tokens?.cache_read === 'number' ? tokens.cache_read : null,
        cache_creation_tokens: typeof tokens?.cache_creation === 'number' ? tokens.cache_creation : null,
        turns: typeof m?.turns === 'number' ? m.turns : null,
        durationMs: typeof workflow?.durationMs === 'number' ? workflow.durationMs : null,
        linesAdded: typeof diffMeta?.linesAdded === 'number' ? diffMeta.linesAdded : null,
        linesRemoved: typeof diffMeta?.linesRemoved === 'number' ? diffMeta.linesRemoved : null,
        prUrl: typeof prMeta?.url === 'string' ? prMeta.url : null,
        runUrl: typeof workflow?.runUrl === 'string' ? workflow.runUrl : null,
        checks,
        origin: e.origin,
        tags: e.tags,
        timeCreated: e.timeCreated,
      };
    });
  },
);

export const getEventSummary = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return {
      total: 0,
      byAgent: [] as [string, number][],
      metrics: [] as { name: string; sum: number; count: number }[],
      checks: [] as { category: string; name: string; passed: number; failed: number }[],
      avgDurationMs: 0,
    };

    const events = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, limit: 200 });

    const agentCounts: Record<string, number> = {};
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};
    const checkStats = new Map<string, { category: string; name: string; passed: number; failed: number }>();
    let totalDurationMs = 0;
    let durationCount = 0;
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;

    const TOKEN_KEYS = ['input', 'output', 'reasoning', 'cache_read', 'cache_creation'] as const;

    for (const e of events) {
      const d = e.data as Record<string, unknown> | undefined;
      if (!d) continue;
      const agentMeta = d.agent as Record<string, unknown> | undefined;
      const diffMeta = d.diff as Record<string, unknown> | undefined;
      const workflow = d.workflow as Record<string, unknown> | undefined;

      // Agent counts
      const agent = typeof agentMeta?.name === 'string' ? agentMeta.name : 'unknown';
      agentCounts[agent] = (agentCounts[agent] ?? 0) + 1;

      // Duration
      if (typeof workflow?.durationMs === 'number') {
        totalDurationMs += workflow.durationMs;
        durationCount++;
      }

      // Lines changed
      if (typeof diffMeta?.linesAdded === 'number') totalLinesAdded += diffMeta.linesAdded;
      if (typeof diffMeta?.linesRemoved === 'number') totalLinesRemoved += diffMeta.linesRemoved;

      // Metrics
      const m = agentMeta?.metrics;
      if (m && typeof m === 'object') {
        const obj = m as Record<string, unknown>;
        const tokens = obj.tokens as Record<string, unknown> | undefined;
        if (tokens && typeof tokens === 'object') {
          for (const key of TOKEN_KEYS) {
            const val = tokens[key];
            if (typeof val === 'number') {
              metricSums[key] = (metricSums[key] ?? 0) + val;
              metricCounts[key] = (metricCounts[key] ?? 0) + 1;
            }
          }
        }
        for (const key of ['turns', 'cost_usd'] as const) {
          const val = obj[key];
          if (typeof val === 'number') {
            metricSums[key] = (metricSums[key] ?? 0) + val;
            metricCounts[key] = (metricCounts[key] ?? 0) + 1;
          }
        }
      }

      // Checks
      const checks = flattenChecks(d.checks);
      for (const c of checks) {
        const key = `${c.category}/${c.name}`;
        let stat = checkStats.get(key);
        if (!stat) {
          stat = { category: c.category, name: c.name, passed: 0, failed: 0 };
          checkStats.set(key, stat);
        }
        if (c.outcome === 'success') stat.passed++;
        else stat.failed++;
      }
    }

    return {
      total: events.length,
      byAgent: Object.entries(agentCounts).sort((a, b) => b[1] - a[1]) as [string, number][],
      metrics: Object.entries(metricSums).map(([name, sum]) => ({
        name,
        sum,
        count: metricCounts[name]!,
      })),
      checks: [...checkStats.values()],
      avgDurationMs: durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0,
      totalLinesAdded,
      totalLinesRemoved,
    };
  },
);
