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
  const base = `/gh/${organization}/${repo}`;
  return {
    plan: plan ?? null,
    parentEvent,
    breadcrumbs: [
      { label: `${organization}/${repo}`, href: base },
      { label: "Agents", href: `${base}/agents` },
      { label: "Plans", href: `${base}/agents/plans` },
      { label: plan?.title ?? id },
    ],
  };
};
