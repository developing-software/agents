import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { Plan } from "@agents/core/events/plan/index";
import { AgentMetrics } from "@agents/core/events/agent-metrics";
import type { PlanStatus } from "./plans/plan-helpers";

const PLAN_STATUSES: PlanStatus[] = [
  "draft",
  "review",
  "approved",
  "implementing",
  "completed",
  "rejected",
];

export const getOverviewMetrics = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
  }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) {
      return {
        planCounts: Object.fromEntries(PLAN_STATUSES.map((s) => [s, 0])) as Record<
          PlanStatus,
          number
        >,
        agentMetrics: null,
      };
    }

    const [plans, agentSummary] = await Promise.all([
      Plan.list({ source: "repository", sourceId: repo.id }),
      AgentMetrics.summary(repo.id, 200),
    ]);

    const planCounts = Object.fromEntries(PLAN_STATUSES.map((s) => [s, 0])) as Record<
      PlanStatus,
      number
    >;
    for (const plan of plans) {
      const status = plan.status as PlanStatus;
      if (status in planCounts) {
        planCounts[status]++;
      }
    }

    return {
      planCounts,
      agentMetrics: {
        total: agentSummary.total,
        workflowSuccess: agentSummary.workflowSuccess,
        workflowFailure: agentSummary.workflowFailure,
        workflowCancelled: agentSummary.workflowCancelled,
        totalCost: agentSummary.totalCost,
        avgDurationMs: agentSummary.avgDurationMs,
        totalLinesAdded: agentSummary.totalLinesAdded,
        totalLinesRemoved: agentSummary.totalLinesRemoved,
      },
    };
  },
);
