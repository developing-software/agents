import type { PageServerLoad } from "./$types";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { pulls: [] };
  const pulls = await GithubPullRequest.listByRepo(repo);
  return { pulls };
};
