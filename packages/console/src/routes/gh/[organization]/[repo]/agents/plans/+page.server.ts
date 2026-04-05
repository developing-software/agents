import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/plan/index";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { plans: [] };
  const plans = await Plan.list({ source: "repository", sourceId: repo.id });
  return { plans };
};
