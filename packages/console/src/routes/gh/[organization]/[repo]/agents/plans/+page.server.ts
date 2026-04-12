import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/events/plan/index";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo, organization, repoName } = await parent();
  if (!repo) return { plans: [] };
  const plans = await Plan.list({ source: "repository", sourceId: repo.id });
  return {
    plans,
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: `${organization}/${repoName}`, href: `/gh/${organization}/${repoName}` },
      { label: "Agents", href: `/gh/${organization}/${repoName}/agents` },
      { label: "Plans" },
    ],
  };
};
