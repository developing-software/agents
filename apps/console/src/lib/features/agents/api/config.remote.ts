import { repoCommand, repoQuery } from "$lib/remote";
import { AgentDiscovery } from "@agents/core/agent";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { getProvider } from "@agents/core/git";
import { posix as path } from "node:path";
import { z } from "zod";


const fileInput = z.object({
  path: z.string(),
  content: z.string(),
});

function commitMessageFor(files: Array<{ path: string }>) {
  if (files.length === 1) {
    return `Update ${path.basename(files[0]!.path)}`;
  }
  const directory = path.dirname(files[0]!.path);
  return `Update agent config in ${directory === "." ? "repo root" : directory}`;
}

export const listAgentConfigPairs = repoQuery({}, async ({ repo }) => AgentDiscovery.findConfigPairs(repo));

export const loadAgentPairContents = repoQuery(
  {
    agentsPath: z.string(),
    claudePath: z.string().nullable().optional(),
  },
  async ({ repo, agentsPath, claudePath }) => {
    const normalizedAgentsPath = AgentDiscovery.assertConfigPath(agentsPath);
    const normalizedClaudePath = claudePath ? AgentDiscovery.assertConfigPath(claudePath) : null;
    const [agents, claude] = await Promise.all([
      AgentDiscovery.readFile(repo, normalizedAgentsPath),
      normalizedClaudePath ? AgentDiscovery.readFile(repo, normalizedClaudePath) : Promise.resolve(null),
    ]);

    if (agents === null) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        `${normalizedAgentsPath} was not found`,
      );
    }

    return {
      agentsPath: normalizedAgentsPath,
      claudePath: normalizedClaudePath,
      agentsContent: agents,
      claudeContent: claude ?? "",
    };
  },
);

export const validateAgentConfigFiles = repoCommand(
  {
    files: z.array(fileInput).min(1),
  },
  async ({ files }) => files.map((file) => AgentDiscovery.validateFile(file.path, file.content)),
);

export const saveAgentConfigFiles = repoCommand(
  {
    files: z.array(fileInput).min(1),
  },
  async ({ repo, files }) => {
    const normalizedFiles = files.map((file) => ({
      path: AgentDiscovery.assertConfigPath(file.path),
      content: file.content,
    }));
    const validation = normalizedFiles.map((file) => AgentDiscovery.validateFile(file.path, file.content));
    const firstError = validation.flatMap((result) => result.issues).find((issue) => issue.level === "error");
    if (firstError) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_PARAMETER,
        firstError.message,
      );
    }

    await getProvider(repo.source).content.commitFiles({
      fullName: repo.fullName,
      files: normalizedFiles,
      message: commitMessageFor(normalizedFiles),
      mode: "direct",
      base: repo.defaultBranch ?? "main",
    });

    return {
      saved: normalizedFiles.map((file) => file.path),
      validation,
    };
  },
);

export const generateClaudeDraft = repoCommand(
  {
    agentsPath: z.string(),
    instructions: z.string().optional(),
  },
  async ({ repo, agentsPath, instructions }) => {
    const normalizedAgentsPath = AgentDiscovery.assertConfigPath(agentsPath);
    const agentsContent = await AgentDiscovery.readFile(repo, normalizedAgentsPath);
    if (agentsContent === null) {
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        `${normalizedAgentsPath} was not found`,
      );
    }

    const directory = path.dirname(normalizedAgentsPath);
    const claudePath =
      directory === "." ? "CLAUDE.md" : path.join(directory, "CLAUDE.md");
    const content = AgentDiscovery.generateClaudeFile({
      agentsPath: normalizedAgentsPath,
      agentsContent,
      instructions,
    });

    return {
      path: claudePath,
      content,
      validation: AgentDiscovery.validateFile(claudePath, content),
    };
  },
);
