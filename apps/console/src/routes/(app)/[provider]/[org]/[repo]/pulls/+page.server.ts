import type { PageServerLoad } from "./$types";
import { getProvider } from "@agents/core/git";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { pulls: [] };
  const pulls = await getProvider(repo.source).pulls.list(repo.fullName, { state: "all" });
  return { pulls };
};
