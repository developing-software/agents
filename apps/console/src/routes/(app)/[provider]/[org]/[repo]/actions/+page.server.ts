import type { PageServerLoad } from "./$types";
import { getProvider } from "@agents/core/git";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  const defaultBranch = repo?.defaultBranch ?? "main";

  if (!repo) return { defaultBranch, workflows: [] };

  try {
    const workflows = await getProvider(repo.source).actions.list(repo.fullName);
    return { defaultBranch, workflows };
  } catch {
    return { defaultBranch, workflows: [] };
  }
};
