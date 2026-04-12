import type { PageServerLoad } from "./$types";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo, organization, repoName } = await parent();
  if (!repo) return { pulls: [] };
  const pulls = await GithubPullRequest.list(repo);
  return {
    pulls,
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: `${organization}/${repoName}`, href: `/gh/${organization}/${repoName}` },
      { label: "Pull Requests" },
    ],
  };
};
