import type { PageServerLoad } from "./$types";
import { GithubWorkflow } from "@agents/core/github/repo/workflow";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  const defaultBranch = repo?.defaultBranch ?? "main";

  if (!repo) return { defaultBranch, workflows: [] };

  try {
    const workflows = await GithubWorkflow.list(repo);
    return { defaultBranch, workflows };
  } catch {
    return { defaultBranch, workflows: [] };
  }
};
