import { posix } from "node:path";
import { z } from "zod";
import { AgentDiscovery } from "@agents/core/agent";
import { VisibleError } from "@agents/core/error";
import { getProvider } from "@agents/core/git";
import { repoCommand, repoQuery } from "$lib/remote";
import { generateClaudeTemplate, validateConfigContent } from "../config/helpers";

const configFileName = z.enum(["AGENTS.md", "CLAUDE.md"]);

function normalizeDirectory(directory: string): string {
  const normalized = posix.normalize(directory || ".");
  if (normalized === ".") return "";
  if (normalized.startsWith("/") || normalized === ".." || normalized.startsWith("../")) {
    throw new VisibleError("validation", "invalid_config_path", "Invalid config directory");
  }
  return normalized.replace(/^\.\//, "");
}

function configPath(directory: string, name: z.infer<typeof configFileName>): string {
  return directory ? `${directory}/${name}` : name;
}

async function requirePair(repo: AgentDiscovery.RepoRef, directory: string) {
  const normalized = normalizeDirectory(directory);
  const pairs = await AgentDiscovery.findConfigPairs(repo);
  const pair = pairs.find((entry) => entry.directory === normalized);
  if (!pair) {
    throw new VisibleError("validation", "config_pair_not_found", "Config pair not found");
  }
  return pair;
}

async function readManagedFile(
  repo: AgentDiscovery.RepoRef,
  path: string,
  ref?: string,
): Promise<{ content: string; sha: string } | null> {
  return getProvider(repo.source).content.readFile(repo.fullName, path, ref);
}

async function writeManagedFile(
  repo: AgentDiscovery.RepoRef & { defaultBranch?: string | null },
  path: string,
  content: string,
  message: string,
): Promise<void> {
  const provider = getProvider(repo.source);
  const current = await readManagedFile(repo, path, repo.defaultBranch ?? undefined);
  await provider.content.writeFile(repo.fullName, {
    path,
    content,
    message,
    branch: repo.defaultBranch ?? undefined,
    sha: current?.sha,
  });
}

function validateOrThrow(name: z.infer<typeof configFileName>, content: string): string[] {
  const errors = validateConfigContent(content);
  if (errors.length > 0) {
    throw new VisibleError("validation", "invalid_config_content", `${name}: ${errors.join(" ")}`);
  }
  return errors;
}

export const listConfigPairs = repoQuery({}, async ({ repo }) => AgentDiscovery.findConfigPairs(repo));

export const loadConfigPair = repoQuery({ directory: z.string() }, async ({ repo, directory }) => {
  const pair = await requirePair(repo, directory);
  const [agentsFile, claudeFile] = await Promise.all([
    readManagedFile(repo, pair.agents?.originalPath ?? configPath(pair.directory, "AGENTS.md"), repo.defaultBranch ?? undefined),
    readManagedFile(repo, pair.claude?.originalPath ?? configPath(pair.directory, "CLAUDE.md"), repo.defaultBranch ?? undefined),
  ]);

  return {
    pair,
    agentsContent: agentsFile?.content ?? null,
    claudeContent: claudeFile?.content ?? null,
  };
});

export const validateConfigFile = repoQuery(
  {
    name: configFileName,
    content: z.string(),
  },
  async ({ name, content }) => ({
    name,
    errors: validateConfigContent(content),
  }),
);

export const saveConfigPair = repoCommand(
  {
    directory: z.string(),
    files: z
      .array(
        z.object({
          name: configFileName,
          content: z.string(),
        }),
      )
      .min(1),
  },
  async ({ repo, directory, files }) => {
    const pair = await requirePair(repo, directory);
    const updates = new Map<string, { name: z.infer<typeof configFileName>; content: string }>();

    for (const file of files) {
      validateOrThrow(file.name, file.content);
      const current = file.name === "AGENTS.md" ? pair.agents : pair.claude;
      const path = current?.originalPath ?? configPath(pair.directory, file.name);
      const existing = updates.get(path);
      if (existing && existing.content !== file.content) {
        throw new VisibleError(
          "validation",
          "conflicting_config_updates",
          `Conflicting edits target ${path}`,
        );
      }
      updates.set(path, file);
    }

    const scope = pair.directory || "repo root";
    const updatedPaths: string[] = [];
    for (const [path, file] of updates) {
      await writeManagedFile(repo, path, file.content, `Update ${file.name} in ${scope}`);
      updatedPaths.push(path);
    }

    return { updatedPaths };
  },
);

export const generateClaudeDraft = repoQuery(
  {
    directory: z.string(),
    instructions: z.string().optional(),
  },
  async ({ repo, directory, instructions }) => {
    const pair = await requirePair(repo, directory);
    if (pair.claude) {
      throw new VisibleError("validation", "claude_exists", "CLAUDE.md already exists for this directory");
    }

    const content = generateClaudeTemplate({
      directory: pair.directory,
      agentsPath: pair.agents?.originalPath,
      instructions,
    });

    return {
      path: configPath(pair.directory, "CLAUDE.md"),
      content,
      errors: validateConfigContent(content),
    };
  },
);
