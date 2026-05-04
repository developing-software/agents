import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo)
    return {
      agentFiles: [],
      agentsFolder: null,
      claudeFolder: [],
      agentPairs: [],
      defaultBranch: "main",
    };

  const [agentFiles, agentsFolder, claudeFolder, agentPairs] = await Promise.all([
    AgentDiscovery.findAgentFiles(repo),
    AgentDiscovery.detectAgentsFolder(repo),
    AgentDiscovery.detectClaudeFolder(repo),
    AgentDiscovery.findAgentPairs(repo),
  ]);

  return {
    agentFiles,
    agentsFolder,
    claudeFolder,
    agentPairs,
    defaultBranch: repo.defaultBranch,
  };
};
