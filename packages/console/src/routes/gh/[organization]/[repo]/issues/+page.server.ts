import type { PageServerLoad } from "./$types";
import { GithubIssue } from "@agents/core/github/repo/issue";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [] };
  const issues = await GithubIssue.list(repo);
  return { issues };
};
