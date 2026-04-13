export type AgentMdFile = {
  path: string;
  sha: string;
  content: string;
};

export type RepoTreeNode = {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size?: number;
  children?: RepoTreeNode[];
};

export type ContextFile = {
  path: string;
  content: string;
  language: string;
  size: number;
};

export type ConfigChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  time: string;
};

export type ConfigChatContext = {
  currentFilePath: string;
  currentFileContent: string;
  contextFiles: ContextFile[];
  repoPaths: string[];
  discovery: {
    agentsFolderExists: boolean;
    claudeFiles: string[];
    agentFilePaths: string[];
  };
};
