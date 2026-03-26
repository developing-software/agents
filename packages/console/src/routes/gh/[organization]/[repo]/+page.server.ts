import type { PageServerLoad } from "./$types";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [], pulls: [] };

  const [issues, pulls] = await Promise.all([
    GithubIssue.listByRepo(repo),
    GithubPullRequest.listByRepo(repo),
  ]);

  return {
    issues: issues.slice(0, 5),
    pulls: pulls.slice(0, 5),
  };
};
