import { z } from "zod";
import { AgentDiscovery } from "@agents/core/agent";
import { getProvider } from "@agents/core/git";
import { VisibleError, ErrorCodes } from "@agents/core/error";
import { repoQuery, repoCommand } from "$lib/remote";

const ALLOWED_FILENAMES = ["AGENTS.md", "CLAUDE.md"];

function validateFilePath(path: string): void {
  if (path.includes("..") || path.startsWith("/") || path.startsWith("\\")) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.INVALID_PARAMETER,
      "Invalid file path: path traversal not allowed",
    );
  }
  const filename = path.split("/").at(-1) ?? "";
  if (!ALLOWED_FILENAMES.includes(filename)) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.INVALID_PARAMETER,
      `Only ${ALLOWED_FILENAMES.join(" and ")} files can be updated via this endpoint`,
    );
  }
}

export const getAgentPairContent = repoQuery(
  {
    agentsPath: z.string(),
    claudePath: z.string(),
    ref: z.string().optional(),
  },
  async ({ repo, agentsPath, claudePath, ref }) => {
    validateFilePath(agentsPath);
    validateFilePath(claudePath);
    return AgentDiscovery.readPairContent(repo, agentsPath, claudePath, ref);
  },
);

export const updateAgentFile = repoCommand(
  {
    path: z.string(),
    content: z.string(),
    sha: z.string().optional(),
    branch: z.string().optional(),
  },
  async ({ repo, path, content, sha, branch }) => {
    validateFilePath(path);
    const provider = getProvider(repo.source);
    await provider.content.writeFile(repo.fullName, {
      path,
      content,
      message: `Update ${path}`,
      branch,
      sha,
    });
    return { ok: true as const };
  },
);

export const generateClaudeFile = repoCommand(
  {
    agentsPath: z.string(),
    claudePath: z.string(),
    instructions: z.string().optional(),
    branch: z.string().optional(),
  },
  async ({ repo, agentsPath, claudePath, instructions, branch }) => {
    validateFilePath(agentsPath);
    validateFilePath(claudePath);

    // Read existing AGENTS.md for context
    const agentsContent = await AgentDiscovery.readFile(repo, agentsPath);

    const directory = claudePath === "CLAUDE.md" ? "" : claudePath.slice(0, -"/CLAUDE.md".length);
    const dirLabel = directory === "" ? "the repository root" : `\`${directory}/\``;

    const template = buildClaudeTemplate(dirLabel, agentsContent, instructions);

    const provider = getProvider(repo.source);
    await provider.content.writeFile(repo.fullName, {
      path: claudePath,
      content: template,
      message: `Add ${claudePath}`,
      branch,
    });

    return { ok: true as const, content: template };
  },
);

function buildClaudeTemplate(
  dirLabel: string,
  agentsContent: string | null,
  instructions?: string,
): string {
  const lines: string[] = [
    `# CLAUDE.md`,
    ``,
    `This file provides guidance to Claude when working in ${dirLabel}.`,
    ``,
  ];

  if (agentsContent) {
    lines.push(
      `## Context from AGENTS.md`,
      ``,
      `The following instructions from \`AGENTS.md\` apply to agents working here:`,
      ``,
      "```",
      agentsContent.trim(),
      "```",
      ``,
    );
  }

  if (instructions) {
    lines.push(`## Additional Instructions`, ``, instructions.trim(), ``);
  }

  lines.push(
    `## Key Notes`,
    ``,
    `- Follow the coding conventions established in this directory`,
    `- Run tests before committing changes`,
    `- Keep changes focused and minimal`,
    ``,
  );

  return lines.join("\n");
}
