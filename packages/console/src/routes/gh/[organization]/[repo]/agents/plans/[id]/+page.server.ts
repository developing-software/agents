import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/events/plan/index";
import { Event } from "@agents/core/events/index";

export const load: PageServerLoad = async ({ params }) => {
  const { organization, repo, id } = params;
  const plan = await Plan.fromID(id);
  let parentEvent: Event.Info | null = null;
  if (plan?.parentEventId) {
    parentEvent = (await Event.fromID(plan.parentEventId)) ?? null;
  }
  return {
    plan: plan ?? null,
    parentEvent,
    breadcrumbs: [
      { label: `${organization}/${repo}`, href: `/gh/${organization}/${repo}` },
      { label: 'Agents', href: `/gh/${organization}/${repo}/agents` },
      { label: 'Plans', href: `/gh/${organization}/${repo}/agents/plans` },
      { label: id.slice(-8) },
    ],
  };
};
