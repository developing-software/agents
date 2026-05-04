import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo)
    return {
      pairs: [] as AgentDiscovery.AgentPair[],
      agentsFolder: null,
      claudeFolder: [] as string[],
      defaultBranch: "main",
    };

  const [pairs, agentsFolder, claudeFolder] = await Promise.all([
    AgentDiscovery.findAgentPairs(repo),
    AgentDiscovery.detectAgentsFolder(repo),
    AgentDiscovery.detectClaudeFolder(repo),
  ]);

  return {
    pairs,
    agentsFolder,
    claudeFolder,
    defaultBranch: repo.defaultBranch,
  };
};
