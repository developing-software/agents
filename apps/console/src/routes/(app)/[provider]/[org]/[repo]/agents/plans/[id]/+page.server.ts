import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/events/plan";
import { Event } from "@agents/core/events";

export const load: PageServerLoad = async ({ params }) => {
  const plan = await Plan.fromID(params.id);
  let parentEvent: Event.Info | null = null;
  if (plan?.parentEventId) {
    parentEvent = (await Event.fromID(plan.parentEventId)) ?? null;
  }
  return { plan: plan ?? null, parentEvent };
};
