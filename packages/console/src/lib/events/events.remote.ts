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

    const METRIC_KEYS = ['input_tokens', 'output_tokens', 'reasoning_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'num_turns', 'cost_usd'] as const;
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

export const listAgentRuns = query(
  z.object({ organization: z.string(), repoName: z.string(), limit: z.number().default(50) }),
  async ({ organization, repoName, limit }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const results = await Event.list({ type: "agent.result", source: "repository", sourceId: repo.id, limit });
    const completed = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, limit });

    // Index completed events by parentEventId for pairing
    const completedByParent = new Map<string, typeof completed[number]>();
    for (const c of completed) {
      if (c.parentEventId) completedByParent.set(c.parentEventId, c);
    }

    return results.map((e) => {
      const d = e.data as Record<string, unknown> | undefined;
      const m = d?.metrics as Record<string, unknown> | undefined;
      const paired = e.parentEventId ? completedByParent.get(e.parentEventId) : undefined;
      const pd = paired?.data as Record<string, unknown> | undefined;
      const checks = pd?.checks as Array<{ category: string; name: string; outcome: string }> | undefined;

      return {
        id: e.id,
        parentEventId: e.parentEventId,
        agent: typeof d?.agent === 'string' ? d.agent : 'unknown',
        model: typeof m?.model === 'string' ? m.model : null,
        cost_usd: typeof m?.cost_usd === 'number' ? m.cost_usd : null,
        input_tokens: typeof m?.input_tokens === 'number' ? m.input_tokens : null,
        output_tokens: typeof m?.output_tokens === 'number' ? m.output_tokens : null,
        reasoning_tokens: typeof m?.reasoning_tokens === 'number' ? m.reasoning_tokens : null,
        cache_read_input_tokens: typeof m?.cache_read_input_tokens === 'number' ? m.cache_read_input_tokens : null,
        cache_creation_input_tokens: typeof m?.cache_creation_input_tokens === 'number' ? m.cache_creation_input_tokens : null,
        num_turns: typeof m?.num_turns === 'number' ? m.num_turns : null,
        durationMs: typeof pd?.durationMs === 'number' ? pd.durationMs : null,
        linesAdded: typeof pd?.linesAdded === 'number' ? pd.linesAdded : null,
        linesRemoved: typeof pd?.linesRemoved === 'number' ? pd.linesRemoved : null,
        prUrl: typeof pd?.prUrl === 'string' ? pd.prUrl : null,
        runUrl: typeof pd?.runUrl === 'string' ? pd.runUrl : null,
        checks: checks ?? [],
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

    // agent.completed is used here (rather than agent.result) because it carries
    // durationMs, checks, linesAdded, and linesRemoved which are not present in
    // agent.result. The metrics field is a copy from the result file — intentional.
    const events = await Event.list({ type: "agent.completed", source: "repository", sourceId: repo.id, limit: 200 });

    const agentCounts: Record<string, number> = {};
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};
    const checkStats = new Map<string, { category: string; name: string; passed: number; failed: number }>();
    let totalDurationMs = 0;
    let durationCount = 0;
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;

    const METRIC_KEYS = ['input_tokens', 'output_tokens', 'reasoning_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'num_turns', 'cost_usd'] as const;

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

      // Lines changed
      if (typeof d.linesAdded === 'number') totalLinesAdded += d.linesAdded;
      if (typeof d.linesRemoved === 'number') totalLinesRemoved += d.linesRemoved;

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
      totalLinesAdded,
      totalLinesRemoved,
    };
  },
);
