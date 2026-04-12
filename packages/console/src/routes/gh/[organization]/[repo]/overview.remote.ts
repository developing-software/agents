import { query } from "$app/server";
import { z } from "zod";
import { Plan } from "@agents/core/events/plan/index";
import { AgentMetrics } from "@agents/core/events/agent-metrics";
import { Repository } from "@agents/core/repository/index";

const input = z.object({
  organization: z.string(),
  repoName: z.string(),
});

export const getOverviewMetrics = query(input, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return null;

  const [plans, agentSummary] = await Promise.all([
    Plan.list({ source: "repository", sourceId: repo.id }),
    AgentMetrics.summary(repo.id, 100),
  ]);

  const planCounts: Record<string, number> = {
    draft: 0,
    review: 0,
    approved: 0,
    implementing: 0,
    completed: 0,
    rejected: 0,
  };
  for (const plan of plans) {
    if (plan.status in planCounts) planCounts[plan.status]++;
  }

  return {
    planCounts,
    agentMetrics: {
      total: agentSummary.total,
      workflowSuccess: agentSummary.workflowSuccess,
      workflowFailure: agentSummary.workflowFailure,
      workflowCancelled: agentSummary.workflowCancelled,
    },
  };
});
