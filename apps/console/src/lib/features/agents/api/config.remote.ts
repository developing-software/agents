import { z } from "zod";
import { AgentDiscovery } from "@agents/core/agent";
import { getProvider } from "@agents/core/git";
import { VisibleError } from "@agents/core/error";
import { repoQuery, repoCommand } from "$lib/remote";

const SAFE_PATH_RE = /^[\w\-./]+$/;

function assertSafePath(path: string): void {
  if (!SAFE_PATH_RE.test(path) || path.includes("..")) {
    throw new VisibleError("validation", "invalid_path", "Invalid file path");
  }
}

export const getAgentPair = repoQuery(
  { agentsPath: z.string() },
  async ({ repo, agentsPath }) => {
    assertSafePath(agentsPath);
    const dir =
      agentsPath.lastIndexOf("/") === -1
        ? ""
        : agentsPath.slice(0, agentsPath.lastIndexOf("/"));
    const claudePath = dir ? `${dir}/CLAUDE.md` : "CLAUDE.md";

    const [agentsFile, claudeFile] = await Promise.all([
      AgentDiscovery.readFile(repo, agentsPath),
      AgentDiscovery.readFile(repo, claudePath),
    ]);

    return { agentsPath, claudePath, agentsContent: agentsFile, claudeContent: claudeFile };
  },
);

export const updateAgentFile = repoCommand(
  {
    path: z.string(),
    content: z.string(),
    sha: z.string().optional(),
    mode: z.enum(["direct", "pr"]).default("pr"),
    branch: z.string().optional(),
  },
  async ({ repo, path, content, sha, mode, branch }) => {
    assertSafePath(path);
    if (mode === "direct") {
      await getProvider(repo.source).content.writeFile(repo.fullName, {
        path,
        content,
        message: `Update ${path}`,
        branch,
        sha,
      });
      return { mode: "direct" as const, branch: branch ?? repo.defaultBranch ?? "main" };
    }
    return getProvider(repo.source).content.commitFiles({
      fullName: repo.fullName,
      files: [{ path, content }],
      message: `Update ${path}`,
      mode: "pr",
      base: branch ?? repo.defaultBranch ?? "main",
    });
  },
);

export const generateClaudeFile = repoCommand(
  {
    agentsPath: z.string(),
    instructions: z.string().optional(),
    mode: z.enum(["direct", "pr"]).default("pr"),
    branch: z.string().optional(),
  },
  async ({ repo, agentsPath, instructions, mode, branch }) => {
    assertSafePath(agentsPath);
    const dir =
      agentsPath.lastIndexOf("/") === -1
        ? ""
        : agentsPath.slice(0, agentsPath.lastIndexOf("/"));
    const claudePath = dir ? `${dir}/CLAUDE.md` : "CLAUDE.md";
    const scope = dir || "repository root";

    const content = [
      `# Claude Instructions — ${scope}`,
      "",
      instructions?.trim() ? instructions.trim() : `Agent instructions for ${scope}.`,
      "",
      "## Context",
      "",
      `This file pairs with \`${agentsPath}\` to provide Claude-specific guidance`,
      "alongside the shared AGENTS.md specification.",
      "",
    ].join("\n");

    if (mode === "direct") {
      await getProvider(repo.source).content.writeFile(repo.fullName, {
        path: claudePath,
        content,
        message: `Add ${claudePath}`,
        branch,
      });
      return { mode: "direct" as const, branch: branch ?? repo.defaultBranch ?? "main", claudePath, content };
    }

    const result = await getProvider(repo.source).content.commitFiles({
      fullName: repo.fullName,
      files: [{ path: claudePath, content }],
      message: `Add ${claudePath}`,
      mode: "pr",
      base: branch ?? repo.defaultBranch ?? "main",
    });
    return { ...result, claudePath, content };
  },
);
