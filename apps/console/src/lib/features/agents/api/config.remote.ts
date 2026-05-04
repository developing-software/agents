import { repoQuery, repoCommand } from "$lib/remote";
import { AgentDiscovery } from "@agents/core/agent";
import { z } from "zod";

export const getAgentPairContent = repoQuery(
  {
    agentsPath: z.string(),
    claudePath: z.string(),
    claudeExists: z.boolean(),
  },
  async ({ repo, agentsPath, claudePath, claudeExists }) => {
    const [agentsFile, claudeFile] = await Promise.all([
      AgentDiscovery.readFileWithSha(repo, agentsPath),
      claudeExists ? AgentDiscovery.readFileWithSha(repo, claudePath) : Promise.resolve(null),
    ]);
    return { agentsFile, claudeFile };
  },
);

export const updateAgentFile = repoCommand(
  {
    path: z.string(),
    content: z.string(),
    sha: z.string().optional(),
    message: z.string().optional(),
  },
  async ({ repo, path, content, sha, message }) => {
    if (path.includes("..") || path.startsWith("/")) {
      throw new Error("Invalid file path");
    }
    if (!path.endsWith("AGENTS.md") && !path.endsWith("CLAUDE.md")) {
      throw new Error("Only AGENTS.md and CLAUDE.md files can be edited here");
    }
    await AgentDiscovery.writeAgentFile(repo, path, content, message ?? `Update ${path}`, sha);
  },
);

export const generateClaudeFile = repoCommand(
  {
    agentsPath: z.string(),
  },
  async ({ repo, agentsPath }) => {
    if (agentsPath.includes("..") || agentsPath.startsWith("/")) {
      throw new Error("Invalid file path");
    }
    const dir = agentsPath.includes("/") ? agentsPath.slice(0, agentsPath.lastIndexOf("/")) : "";
    const claudePath = dir ? `${dir}/CLAUDE.md` : "CLAUDE.md";
    const content = AgentDiscovery.generateClaudeTemplate(agentsPath);
    await AgentDiscovery.writeAgentFile(
      repo,
      claudePath,
      content,
      `Generate CLAUDE.md for ${dir || "root"}`,
    );
    return { claudePath };
  },
);
