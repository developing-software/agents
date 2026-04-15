import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (locals.actor.type !== "account") throw redirect(302, "/login");
  const repos = await Repository.listByOwner(params.organization);
  return { repos, organization: params.organization };
};
