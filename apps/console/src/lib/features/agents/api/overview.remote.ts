import { Event } from "@agents/core/events";
import { AgentEvent } from "@agents/core/events/agent";
import { Plan } from "@agents/core/events/plan";
import { repoQuery } from "$lib/remote";
import { PLAN_STATUSES, type PlanStatus } from "../plans/plan-helpers";

export type OverviewAgentMetrics = {
  recentRunCount: number;
  successRate: number | null;
  totalCost: number | null;
  lastActivityAt: string | null;
};

export type OverviewMetricsResult = {
  planCounts: Record<PlanStatus, number>;
  agentMetrics: OverviewAgentMetrics;
};

function initPlanCounts(): Record<PlanStatus, number> {
  return {
    draft: 0,
    review: 0,
    approved: 0,
    implementing: 0,
    completed: 0,
    rejected: 0,
  };
}

export const getOverviewMetrics = repoQuery({}, async ({ repo }) => {
  const [plans, events] = await Promise.all([
    Plan.list({ source: "repository", sourceId: repo.id }),
    Event.list({
      type: "agent",
      source: "repository",
      sourceId: repo.id,
      limit: 200,
    }),
  ]);

  const planCounts = initPlanCounts();
  for (const plan of plans) {
    if (PLAN_STATUSES.includes(plan.status as PlanStatus)) {
      planCounts[plan.status as PlanStatus] += 1;
    }
  }

  const now = Date.now();
  const recentThreshold = now - 30 * 24 * 60 * 60 * 1000;

  let recentRunCount = 0;
  let successCount = 0;
  let concludedCount = 0;
  let totalCost = 0;
  let hasCost = false;
  let lastActivityAt: string | null = null;

  for (const event of events) {
    if (!lastActivityAt || event.timeCreated > lastActivityAt) {
      lastActivityAt = event.timeCreated;
    }

    const timeCreatedMs = new Date(event.timeCreated).getTime();
    if (!Number.isFinite(timeCreatedMs) || timeCreatedMs < recentThreshold) continue;

    recentRunCount += 1;

    const parsed = AgentEvent.Completed.parse(event.data);
    const conclusion = parsed.workflow.conclusion;
    if (conclusion) {
      concludedCount += 1;
      if (conclusion === "success") successCount += 1;
    }

    const cost = parsed.agent.metrics?.cost_usd;
    if (typeof cost === "number") {
      totalCost += cost;
      hasCost = true;
    }
  }

  return {
    planCounts,
    agentMetrics: {
      recentRunCount,
      successRate: concludedCount > 0 ? Math.round((successCount / concludedCount) * 100) : null,
      totalCost: hasCost ? totalCost : null,
      lastActivityAt,
    },
  } satisfies OverviewMetricsResult;
});
