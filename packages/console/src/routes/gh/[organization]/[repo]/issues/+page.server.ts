import type { PageServerLoad } from "./$types";
import { GithubIssue } from "@agents/core/github/repo/issue";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo, organization, repoName } = await parent();
  if (!repo) return { issues: [] };
  const issues = await GithubIssue.list(repo);
  return {
    issues,
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: `${organization}/${repoName}`, href: `/gh/${organization}/${repoName}` },
      { label: "Issues" },
    ],
  };
};
