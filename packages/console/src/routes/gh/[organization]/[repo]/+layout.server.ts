import type { LayoutServerLoad } from "./$types";
import { GithubRepo } from "@agents/core/github/repo/index";

export const load: LayoutServerLoad = async ({ params }) => {
  const { organization, repo } = params;
  const repoData = await GithubRepo.findByFullName(`${organization}/${repo}`);
  return { repo: repoData, organization, repoName: repo };
};
