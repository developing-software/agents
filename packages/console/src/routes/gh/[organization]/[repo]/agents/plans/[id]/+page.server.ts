import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/events/plan/index";
import { Event } from "@agents/core/events/index";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { organization, repoName } = await parent();
  const plan = await Plan.fromID(params.id);
  let parentEvent: Event.Info | null = null;
  if (plan?.parentEventId) {
    parentEvent = (await Event.fromID(plan.parentEventId)) ?? null;
  }
  const planTitle = plan?.title ?? `Plan ${params.id}`;
  return {
    plan: plan ?? null,
    parentEvent,
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: `${organization}/${repoName}`, href: `/gh/${organization}/${repoName}` },
      { label: "Agents", href: `/gh/${organization}/${repoName}/agents` },
      { label: "Plans", href: `/gh/${organization}/${repoName}/agents/plans` },
      { label: planTitle },
    ],
  };
};
