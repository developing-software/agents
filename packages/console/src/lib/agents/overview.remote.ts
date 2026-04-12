import { query } from "$app/server";
import { z } from "zod";
import { Plan } from "@agents/core/events/plan/index";
import { AgentMetrics } from "@agents/core/events/agent-metrics";
import { Repository } from "@agents/core/repository/index";

export const getOverviewMetrics = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) {
      return {
        planCounts: {
          draft: 0,
          review: 0,
          approved: 0,
          implementing: 0,
          completed: 0,
          rejected: 0,
        },
        agentSummary: null,
      };
    }

    const [plans, agentSummary] = await Promise.all([
      Plan.list({ source: "repository", sourceId: repo.id }),
      AgentMetrics.summary(repo.id),
    ]);

    const planCounts = {
      draft: 0,
      review: 0,
      approved: 0,
      implementing: 0,
      completed: 0,
      rejected: 0,
    };
    for (const plan of plans) {
      if (plan.status in planCounts) {
        planCounts[plan.status as keyof typeof planCounts]++;
      }
    }

    return { planCounts, agentSummary };
  },
);
