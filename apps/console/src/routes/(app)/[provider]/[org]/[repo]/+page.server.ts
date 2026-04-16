import type { PageServerLoad } from "./$types";
import { getProvider } from "@agents/core/git";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [], pulls: [] };

  const provider = getProvider(repo.source);
  const [issues, pulls] = await Promise.all([
    provider.issues.list(repo.fullName),
    provider.pulls.list(repo.fullName),
  ]);

  return {
    issues: issues.slice(0, 5),
    pulls: pulls.slice(0, 5),
  };
};
