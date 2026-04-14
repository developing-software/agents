import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { agentFiles: [], agentsFolder: null, claudeFolder: [] };

  const [agentFiles, agentsFolder, claudeFolder] = await Promise.all([
    AgentDiscovery.findAgentFiles(repo),
    AgentDiscovery.detectAgentsFolder(repo),
    AgentDiscovery.detectClaudeFolder(repo),
  ]);

  return { agentFiles, agentsFolder, claudeFolder };
};
