import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { Event } from "@agents/core/events/index";

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
      const agent = typeof d.agent === 'string' ? d.agent : 'unknown';

      let entry = agents.get(agent);
      if (!entry) {
        entry = { agent, count: 0, totalDurationMs: 0, durationCount: 0, checks: new Map() };
        agents.set(agent, entry);
      }
      entry.count++;

      if (typeof d.durationMs === 'number') {
        entry.totalDurationMs += d.durationMs;
        entry.durationCount++;
      }

      const checks = d.checks;
      if (Array.isArray(checks)) {
        for (const c of checks) {
          if (!c || typeof c !== 'object') continue;
          const { category, name, outcome } = c as Record<string, unknown>;
          if (typeof category !== 'string' || typeof name !== 'string') continue;
          const key = `${category}/${name}`;
          let stat = entry.checks.get(key);
          if (!stat) {
            stat = { category, name, passed: 0, failed: 0 };
            entry.checks.set(key, stat);
          }
          if (outcome === 'success') stat.passed++;
          else stat.failed++;
        }
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

    const events = await Event.list({ type: "agent.result", source: "repository", sourceId: repo.id, limit: 500 });

    const METRIC_KEYS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'num_turns', 'cost_usd'] as const;
    const agents = new Map<string, {
      agent: string;
      count: number;
      sums: Record<string, number>;
      counts: Record<string, number>;
      models: Record<string, number>;
      lastSeen: string;
    }>();

    for (const e of events) {
      const agent = typeof e.data?.agent === 'string' ? e.data.agent : 'unknown';

      let entry = agents.get(agent);
      if (!entry) {
        entry = { agent, count: 0, sums: {}, counts: {}, models: {}, lastSeen: e.timeCreated };
        agents.set(agent, entry);
      }
      entry.count++;
      if (e.timeCreated > entry.lastSeen) entry.lastSeen = e.timeCreated;

      const m = e.data?.metrics;
      if (m && typeof m === 'object') {
        const obj = m as Record<string, unknown>;
        for (const key of METRIC_KEYS) {
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

    const METRIC_KEYS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'num_turns', 'cost_usd'] as const;

    for (const e of events) {
      const d = e.data as Record<string, unknown> | undefined;
      if (!d) continue;

      // Agent counts
      const agent = typeof d.agent === 'string' ? d.agent : 'unknown';
      agentCounts[agent] = (agentCounts[agent] ?? 0) + 1;

      // Duration
      if (typeof d.durationMs === 'number') {
        totalDurationMs += d.durationMs;
        durationCount++;
      }

      // Metrics
      const m = d.metrics;
      if (m && typeof m === 'object') {
        const obj = m as Record<string, unknown>;
        for (const key of METRIC_KEYS) {
          const val = obj[key];
          if (typeof val === 'number') {
            metricSums[key] = (metricSums[key] ?? 0) + val;
            metricCounts[key] = (metricCounts[key] ?? 0) + 1;
          }
        }
      }

      // Checks
      const checks = d.checks;
      if (Array.isArray(checks)) {
        for (const c of checks) {
          if (!c || typeof c !== 'object') continue;
          const { category, name, outcome } = c as Record<string, unknown>;
          if (typeof category !== 'string' || typeof name !== 'string') continue;
          const key = `${category}/${name}`;
          let stat = checkStats.get(key);
          if (!stat) {
            stat = { category, name, passed: 0, failed: 0 };
            checkStats.set(key, stat);
          }
          if (outcome === 'success') stat.passed++;
          else stat.failed++;
        }
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
    };
  },
);
