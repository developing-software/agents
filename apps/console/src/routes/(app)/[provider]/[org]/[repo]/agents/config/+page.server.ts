import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo)
    return {
      pairs: [],
      defaultBranch: "main",
    };

  const pairs = await AgentDiscovery.findConfigPairs(repo);

  return {
    pairs,
    defaultBranch: repo.defaultBranch,
  };
};
