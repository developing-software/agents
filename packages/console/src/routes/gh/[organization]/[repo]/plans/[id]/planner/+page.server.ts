import type { PageServerLoad } from "./$types";
import { Plan } from "@agents/core/plan/index";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params }) => {
  const plan = await Plan.fromID(params.id);
  if (!plan) throw error(404, "Plan not found");
  return {
    plan: {
      id: plan.id,
      title: plan.title,
      status: plan.status,
      body: plan.body,
      tags: plan.tags,
    },
  };
};
