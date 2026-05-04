import { z } from "zod";
import { AgentDiscovery } from "@agents/core/agent";
import { getProvider } from "@agents/core/git";
import { VisibleError } from "@agents/core/error";
import { repoCommand, repoQuery } from "$lib/remote";

const PATH_TRAVERSAL = /(?:^|[/\\])\.\.(?:[/\\]|$)/;

function validatePath(path: string) {
  if (PATH_TRAVERSAL.test(path))
    throw new VisibleError("validation", "invalid_path", "Invalid file path");
  if (!path.endsWith(".md"))
    throw new VisibleError("validation", "invalid_file_type", "Only markdown files are allowed");
}

export const getAgentPairs = repoQuery({}, async ({ repo }) =>
  AgentDiscovery.findAgentPairs(repo),
);

export const getFileContent = repoQuery(
  { path: z.string() },
  async ({ repo, path }) => {
    validatePath(path);
    return AgentDiscovery.readFile(repo, path);
  },
);

export const updateFile = repoCommand(
  {
    path: z.string(),
    content: z.string(),
    mode: z.enum(["direct", "pr"]).default("direct"),
  },
  async ({ repo, path, content, mode }) => {
    validatePath(path);
    const name = path.split("/").pop() ?? path;
    return getProvider(repo.source).content.commitFiles({
      fullName: repo.fullName,
      files: [{ path, content }],
      message: `Update ${name}`,
      mode,
    });
  },
);

export const generateClaudeFile = repoCommand(
  {
    directory: z.string(),
    instructions: z.string().optional(),
    mode: z.enum(["direct", "pr"]).default("direct"),
  },
  async ({ repo, directory, instructions, mode }) => {
    const dir = directory === "." ? "" : directory;
    const claudePath = dir ? `${dir}/CLAUDE.md` : "CLAUDE.md";
    validatePath(claudePath);

    const agentsPath = dir ? `${dir}/AGENTS.md` : "AGENTS.md";
    const agentsContent = await AgentDiscovery.readFile(repo, agentsPath).catch(() => null);

    const lines = [`# CLAUDE.md`];
    if (dir) lines.push(``, `Context for \`${dir}/\`.`);

    if (agentsContent) {
      lines.push(``, `## From AGENTS.md`, ``, agentsContent.trim());
    }

    if (instructions) {
      lines.push(``, `## Additional Instructions`, ``, instructions.trim());
    }

    if (!agentsContent && !instructions) {
      lines.push(``, `<!-- Add project-specific instructions for Claude here -->`);
    }

    const content = lines.join("\n") + "\n";

    await getProvider(repo.source).content.commitFiles({
      fullName: repo.fullName,
      files: [{ path: claudePath, content }],
      message: `Add ${claudePath}`,
      mode,
    });

    return { path: claudePath, content };
  },
);
