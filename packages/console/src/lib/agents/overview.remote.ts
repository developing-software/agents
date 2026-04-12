import { query } from "$app/server";
import { z } from "zod";
import { Plan } from "@agents/core/events/plan/index";
import { AgentMetrics } from "@agents/core/events/agent-metrics";
import { Repository } from "@agents/core/repository/index";
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
        agentSummary: null,
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

    return { planCounts, agentSummary };
  },
);
