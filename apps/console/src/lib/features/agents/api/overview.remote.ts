import { query } from "$app/server";
import { Plan } from "@agents/core/events/plan";
import { AgentMetrics } from "@agents/core/events/agent-metrics";
import { repoInput } from "$lib/remote";
import { withRequestRepoActor } from "$lib/server/repository.server";

export type PlanStatus =
  | "draft"
  | "review"
  | "approved"
  | "implementing"
  | "completed"
  | "rejected";

export interface OverviewMetricsResult {
  planCounts: Record<PlanStatus, number>;
  agentMetrics: {
    recentRunCount: number;
    successRate: number | null;
    totalCost: number | null;
  };
}

export const getOverviewMetrics = query(
  repoInput,
  async ({ organization, repoName }) =>
    withRequestRepoActor({ organization, repoName }, async (repo) => {
      const [plans, agentSummary] = await Promise.all([
        Plan.list({ source: "repository", sourceId: repo.id }),
        AgentMetrics.summary(repo.id),
      ]);

      const planCounts: Record<PlanStatus, number> = {
        draft: 0,
        review: 0,
        approved: 0,
        implementing: 0,
        completed: 0,
        rejected: 0,
      };

      for (const plan of plans) {
        const status = plan.status as PlanStatus;
        if (status in planCounts) planCounts[status]++;
      }

      const concluded =
        agentSummary.workflowSuccess +
        agentSummary.workflowFailure +
        agentSummary.workflowCancelled;

      return {
        planCounts,
        agentMetrics: {
          recentRunCount: agentSummary.total,
          successRate:
            concluded > 0
              ? Math.round((agentSummary.workflowSuccess / concluded) * 100)
              : null,
          totalCost: agentSummary.totalCost > 0 ? agentSummary.totalCost : null,
        },
      } satisfies OverviewMetricsResult;
    }),
);
