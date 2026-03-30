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

export const getEventSummary = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return { total: 0, byType: [] as [string, number][], byOrigin: [] as [string, number][], metrics: [] as { name: string; sum: number; count: number }[] };

    const events = await Event.list({ source: "repository", sourceId: repo.id, limit: 200 });

    const typeCounts: Record<string, number> = {};
    const originCounts: Record<string, number> = {};
    const metricSums: Record<string, number> = {};
    const metricCounts: Record<string, number> = {};

    const METRIC_KEYS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens', 'num_turns', 'cost_usd'] as const;

    for (const e of events) {
      const prefix = e.type.indexOf('.') === -1 ? e.type : e.type.slice(0, e.type.indexOf('.'));
      typeCounts[prefix] = (typeCounts[prefix] ?? 0) + 1;
      originCounts[e.origin] = (originCounts[e.origin] ?? 0) + 1;

      const m = e.data?.metrics;
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
    }

    return {
      total: events.length,
      byType: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]) as [string, number][],
      byOrigin: Object.entries(originCounts).sort((a, b) => b[1] - a[1]) as [string, number][],
      metrics: Object.entries(metricSums).map(([name, sum]) => ({
        name,
        sum,
        count: metricCounts[name],
      })),
    };
  },
);
