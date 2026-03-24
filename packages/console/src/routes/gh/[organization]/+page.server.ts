import type { PageServerLoad } from "./$types";
import { GithubRepo } from "@agents/core/github/repo/index";

export const load: PageServerLoad = async ({ params }) => {
  const repos = await GithubRepo.listByOwner(params.organization);
  return { repos, organization: params.organization };
};
