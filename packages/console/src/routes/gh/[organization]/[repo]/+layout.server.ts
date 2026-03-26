import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { GithubRepo } from "@agents/core/github/repo/index";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  if (!locals.userID) throw redirect(302, "/");
  const { organization, repo } = params;
  const repoData = await GithubRepo.findByFullName(`${organization}/${repo}`);
  return { repo: repoData, organization, repoName: repo };
};
