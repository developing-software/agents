import { error } from "@sveltejs/kit";
import { z } from "zod";
import { AgentDiscovery } from "@agents/core/agent";
import { getProvider } from "@agents/core/git";
import { parseFrontmatter } from "@agents/core/util/yaml";
import { repoCommand, repoQuery } from "$lib/remote";

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function claudePathForAgents(agentsPath: string): string {
  const directory = dirname(agentsPath);
  return directory ? `${directory}/CLAUDE.md` : "CLAUDE.md";
}

function isConfigPath(path: string): boolean {
  if (!path || path.includes("\\")) return false;
  const segments = path.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return false;
  }
  const name = basename(path);
  return name === "AGENTS.md" || name === "CLAUDE.md";
}

function assertConfigPath(path: string): string {
  if (!isConfigPath(path)) error(400, "Invalid config path");
  return path;
}

function validateContent(path: string, content: string) {
  const issues: string[] = [];
  if (!content.trim()) {
    issues.push(`${basename(path)} cannot be empty.`);
  }

  const trimmed = content.trimStart();
  if (trimmed.startsWith("---") && trimmed.indexOf("\n---", 3) === -1) {
    issues.push("Frontmatter must end with a closing --- line.");
  }

  try {
    parseFrontmatter(content);
  } catch (cause) {
    issues.push(cause instanceof Error ? cause.message : "Invalid frontmatter.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function buildClaudeContent(input: {
  agentsPath: string;
  agentsContent: string;
  instructions?: string;
}) {
  const additional = input.instructions?.trim();
  const lines = [
    "# CLAUDE.md",
    "",
    `Generated from \`${input.agentsPath}\`.`,
    "",
    "Use the shared instructions below when acting as Claude in this scope.",
    "",
  ];

  if (additional) {
    lines.push("## Additional Context", "", additional, "");
  }

  lines.push("## Shared Instructions", "", input.agentsContent.trim(), "");
  return `${lines.join("\n").trim()}\n`;
}

async function loadPairs(repo: AgentDiscovery.RepoRef) {
  return AgentDiscovery.findConfigPairs(repo);
}

async function loadPair(repo: AgentDiscovery.RepoRef, agentsPath: string) {
  const normalizedPath = assertConfigPath(agentsPath);
  const pairs = await loadPairs(repo);
  const pair = pairs.find((item) => item.agents.path === normalizedPath);
  if (!pair) error(404, `Config pair not found for ${agentsPath}`);
  return pair;
}

export const listConfigPairs = repoQuery({}, async ({ repo }) => loadPairs(repo));

export const getConfigPair = repoQuery(
  {
    agentsPath: z.string(),
  },
  async ({ repo, agentsPath }) => {
    const provider = getProvider(repo.source);
    const pair = await loadPair(repo, agentsPath);
    const [agentsFile, claudeFile] = await Promise.all([
      provider.content.readFile(repo.fullName, pair.agents.path),
      pair.claude ? provider.content.readFile(repo.fullName, pair.claude.path) : Promise.resolve(null),
    ]);

    if (!agentsFile) error(404, `${pair.agents.path} was not found`);

    return {
      pair,
      files: {
        agents: {
          ...pair.agents,
          sha: agentsFile.sha,
          content: agentsFile.content,
        },
        claude: pair.claude
          ? {
              ...pair.claude,
              sha: claudeFile?.sha ?? pair.claude.sha,
              content: claudeFile?.content ?? "",
            }
          : null,
        proposedClaudePath: pair.claude?.path ?? claudePathForAgents(pair.agents.path),
      },
    };
  },
);

export const validateConfigContent = repoQuery(
  {
    path: z.string(),
    content: z.string(),
  },
  async ({ path, content }) => {
    const normalizedPath = assertConfigPath(path);
    return validateContent(normalizedPath, content);
  },
);

export const updateConfigFile = repoCommand(
  {
    path: z.string(),
    content: z.string(),
    sha: z.string().nullable().optional(),
  },
  async ({ repo, path, content, sha }) => {
    const normalizedPath = assertConfigPath(path);
    const pairs = await loadPairs(repo);
    const allowedPaths = new Set(
      pairs.flatMap((pair) => [pair.agents.path, pair.claude?.path].filter((value): value is string => !!value)),
    );
    if (!allowedPaths.has(normalizedPath)) {
      error(403, `${normalizedPath} is not editable from this page`);
    }

    const validation = validateContent(normalizedPath, content);
    if (!validation.valid) error(400, validation.issues[0] ?? "Invalid config content");

    await getProvider(repo.source).content.writeFile(repo.fullName, {
      path: normalizedPath,
      content,
      message: `Update ${basename(normalizedPath)}`,
      sha: sha ?? undefined,
    });

    return {
      path: normalizedPath,
      validation,
    };
  },
);

export const generateClaudePreview = repoQuery(
  {
    agentsPath: z.string(),
    instructions: z.string().default(""),
  },
  async ({ repo, agentsPath, instructions }) => {
    const pair = await loadPair(repo, agentsPath);
    if (pair.claude) error(400, `${pair.claude.path} already exists`);

    const agentsFile = await getProvider(repo.source).content.readFile(repo.fullName, pair.agents.path);
    if (!agentsFile) error(404, `${pair.agents.path} was not found`);

    const path = claudePathForAgents(pair.agents.path);
    const content = buildClaudeContent({
      agentsPath: pair.agents.path,
      agentsContent: agentsFile.content,
      instructions,
    });

    return {
      path,
      content,
      validation: validateContent(path, content),
    };
  },
);

export const createClaudeFile = repoCommand(
  {
    agentsPath: z.string(),
    content: z.string(),
  },
  async ({ repo, agentsPath, content }) => {
    const pair = await loadPair(repo, agentsPath);
    if (pair.claude) error(400, `${pair.claude.path} already exists`);

    const path = claudePathForAgents(pair.agents.path);
    const validation = validateContent(path, content);
    if (!validation.valid) error(400, validation.issues[0] ?? "Invalid CLAUDE.md content");

    await getProvider(repo.source).content.writeFile(repo.fullName, {
      path,
      content,
      message: `Create ${basename(path)}`,
    });

    return {
      path,
      validation,
    };
  },
);
