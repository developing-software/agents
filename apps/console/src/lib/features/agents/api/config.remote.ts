import { AgentDiscovery } from "@agents/core/agent";
import { getProvider } from "@agents/core/git";
import { repoCommand, repoQuery } from "$lib/remote";
import { z } from "zod";

export type AgentPairResult = AgentDiscovery.AgentPair & {
  agentsContent?: string | null;
  claudeContent?: string | null;
};

export const getAgentPairs = repoQuery({}, async ({ repo }) => {
  return AgentDiscovery.findAgentPairs(repo);
});

export const getAgentPairContent = repoQuery(
  { directory: z.string() },
  async ({ repo, directory }) => {
    const ref = repo.defaultBranch ?? "HEAD";
    const agentsPath = directory === "." ? "AGENTS.md" : `${directory}/AGENTS.md`;
    const claudePath = directory === "." ? "CLAUDE.md" : `${directory}/CLAUDE.md`;

    const [agentsContent, claudeContent] = await Promise.all([
      AgentDiscovery.readFile(repo, agentsPath, ref),
      AgentDiscovery.readFile(repo, claudePath, ref),
    ]);

    return { agentsContent, claudeContent };
  },
);

const PATH_TRAVERSAL = /(?:^|[/\\])\.\.(?:[/\\]|$)/;

export const updateAgentFile = repoCommand(
  {
    path: z.string(),
    content: z.string(),
    message: z.string().optional(),
    branch: z.string().optional(),
  },
  async ({ repo, path, content, message, branch }) => {
    if (PATH_TRAVERSAL.test(path)) throw new Error("Invalid file path");
    const name = path.split("/").pop();
    if (name !== "AGENTS.md" && name !== "CLAUDE.md")
      throw new Error("Only AGENTS.md and CLAUDE.md files can be updated");

    const provider = getProvider(repo.source);
    const ref = branch ?? repo.defaultBranch ?? "main";

    const existing = await provider.content.readFile(repo.fullName, path, ref);

    await provider.content.writeFile(repo.fullName, {
      path,
      content,
      message: message ?? `Update ${path}`,
      branch: ref,
      sha: existing?.sha,
    });
  },
);

export const generateClaudeFile = repoCommand(
  {
    directory: z.string(),
    instructions: z.string().optional(),
    branch: z.string().optional(),
  },
  async ({ repo, directory, instructions, branch }) => {
    if (PATH_TRAVERSAL.test(directory)) throw new Error("Invalid directory path");

    const provider = getProvider(repo.source);
    const ref = branch ?? repo.defaultBranch ?? "main";
    const claudePath = directory === "." ? "CLAUDE.md" : `${directory}/CLAUDE.md`;

    const existing = await provider.content.readFile(repo.fullName, claudePath, ref);
    if (existing) throw new Error("CLAUDE.md already exists at this location");

    const agentsPath = directory === "." ? "AGENTS.md" : `${directory}/AGENTS.md`;
    const agentsContent = await AgentDiscovery.readFile(repo, agentsPath, ref);

    const directoryLabel = directory === "." ? "root" : directory;
    let content = `# ${directoryLabel}\n\n`;
    if (instructions) {
      content += `${instructions}\n`;
    } else if (agentsContent) {
      content += agentsContent;
    } else {
      content += `Codebase instructions for the \`${directoryLabel}\` directory.\n`;
    }

    await provider.content.writeFile(repo.fullName, {
      path: claudePath,
      content,
      message: `Add ${claudePath}`,
      branch: ref,
    });

    return { path: claudePath, content };
  },
);
