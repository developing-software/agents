import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { GithubRepo } from "@agents/core/github/repo/index";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.userID) throw redirect(302, "/");
  const repos = await GithubRepo.listByOwner(params.organization);
  return { repos, organization: params.organization };
};
