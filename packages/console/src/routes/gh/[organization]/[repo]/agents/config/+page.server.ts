import type { PageServerLoad } from "./$types";
import { AgentDiscovery } from "@agents/core/agent";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { agentFiles: [], agentsFolder: null, claudeFolder: [] };

  const repoRef = {
    installationId: repo.installationId,
    owner: repo.owner,
    repo: repo.repo,
  };

  const [agentFilesMeta, agentsFolder, claudeFolder] = await Promise.all([
    AgentDiscovery.findAgentFiles(repoRef),
    AgentDiscovery.detectAgentsFolder(repoRef),
    AgentDiscovery.detectClaudeFolder(repoRef),
  ]);

  // Load content for all AGENTS.md files in parallel
  const agentFiles = await Promise.all(
    agentFilesMeta.map(async (f) => {
      const content = await AgentDiscovery.readFile(repoRef, f.path);
      return { path: f.path, sha: f.sha, content: content ?? "" };
    }),
  );

  return { agentFiles, agentsFolder, claudeFolder };
};
