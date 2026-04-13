import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo)
    return {
      agentFiles: [],
      agentsFolder: null,
      claudeFolder: [],
      agentFileContents: [] as Array<{ path: string; sha: string; content: string }>,
    };

  const [agentFiles, agentsFolder, claudeFolder] = await Promise.all([
    AgentDiscovery.findAgentFiles(repo),
    AgentDiscovery.detectAgentsFolder(repo),
    AgentDiscovery.detectClaudeFolder(repo),
  ]);

  // Pre-load content for all AGENTS.md files
  const agentFileContents = await Promise.all(
    agentFiles.map(async (file) => {
      const content = await AgentDiscovery.readFile(repo, file.path);
      return { path: file.path, sha: file.sha, content: content ?? "" };
    }),
  );

  return { agentFiles, agentsFolder, claudeFolder, agentFileContents };
};
