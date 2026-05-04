import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo)
    return {
      configPairs: [],
      defaultBranch: "main",
    };

  const configPairs = await AgentDiscovery.findConfigPairs(repo);

  return {
    configPairs,
    defaultBranch: repo.defaultBranch,
  };
};
