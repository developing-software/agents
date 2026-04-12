import type { PageServerLoad } from "./$types";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { Plan } from "@agents/core/events/plan/index";
import { Event } from "@agents/core/events/index";
import { PlanStatus } from "@agents/core/events/plan/plan.sql";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [], pulls: [], overviewMetrics: null };

  const [issues, pulls, plans, agentEvents] = await Promise.all([
    GithubIssue.list(repo),
    GithubPullRequest.list(repo),
    Plan.list({ sourceId: repo.id }),
    Event.list({
      sourceId: repo.id,
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      limit: 100,
    }),
  ]);

  // Count plans by status
  const planCounts: Record<string, number> = {};
  for (const status of PlanStatus) {
    planCounts[status] = 0;
  }
  for (const plan of plans) {
    planCounts[plan.status]++;
  }

  // Count agent metrics
  let successCount = 0;
  let totalAgentRuns = 0;
  for (const event of agentEvents) {
    if (event.type.startsWith("agent.")) {
      totalAgentRuns++;
      if (
        event.type === "agent.completed" ||
        event.type === "agent.success" ||
        (event.data &&
          typeof event.data === "object" &&
          "status" in event.data &&
          event.data.status === "success")
      ) {
        successCount++;
      }
    }
  }

  const successRate = totalAgentRuns > 0 ? Math.round((successCount / totalAgentRuns) * 100) : 0;

  return {
    issues: issues.slice(0, 5),
    pulls: pulls.slice(0, 5),
    overviewMetrics: {
      planCounts,
      agentMetrics: {
        recentEventCount: agentEvents.length,
        agentRunCount: totalAgentRuns,
        successRate,
      },
    },
  };
};
