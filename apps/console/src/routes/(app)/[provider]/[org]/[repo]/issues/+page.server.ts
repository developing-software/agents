import type { PageServerLoad } from "./$types";
import { getProvider } from "@agents/core/git";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [] };
  const issues = await getProvider(repo.source).issues.list(repo.fullName, { state: "all" });
  return { issues };
};
