import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/plan/index";

export const load: PageServerLoad = async ({ params }) => {
  const plan = await Plan.fromID(params.id);
  return { plan: plan ?? null };
};
