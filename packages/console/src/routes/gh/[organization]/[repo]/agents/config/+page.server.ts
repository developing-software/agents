import type { PageServerLoad } from './$types';
import { AgentDiscovery } from '@agents/core/agent';
import { GithubContent } from '@agents/core/github/repo/content';

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) {
    return {
      agentFiles: [],
      agentMdFiles: [],
      agentsFolder: null,
      claudeFolder: [],
      repoTreeRoot: [],
      repoPaths: [],
    };
  }

  const [agentFiles, agentsFolder, claudeFolder, repoTreeRoot, fullTree] = await Promise.all([
    AgentDiscovery.findAgentFiles(repo),
    AgentDiscovery.detectAgentsFolder(repo),
    AgentDiscovery.detectClaudeFolder(repo),
    GithubContent.listDir(repo, ''),
    GithubContent.getTree(repo),
  ]);

  const agentMdFiles = await Promise.all(
    agentFiles.map(async (file) => ({
      path: file.path,
      sha: file.sha,
      content: (await AgentDiscovery.readFile(repo, file.path)) ?? '',
    })),
  );

  const treeEntries = (repoTreeRoot ?? [])
    .filter((entry) => entry.type === 'dir' || entry.type === 'file')
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    })
    .map((entry) => {
      const type: 'dir' | 'file' = entry.type === 'dir' ? 'dir' : 'file';
      return {
        name: entry.name,
        path: entry.path,
        type,
        size: entry.size,
      };
    });

  return {
    agentFiles,
    agentMdFiles: agentMdFiles.sort((a, b) => a.path.localeCompare(b.path)),
    agentsFolder,
    claudeFolder,
    repoTreeRoot: treeEntries,
    repoPaths: fullTree.filter((entry) => entry.type === 'blob').map((entry) => entry.path),
  };
};
