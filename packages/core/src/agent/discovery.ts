import { posix as path } from "node:path";
import { z } from "zod";
import { ErrorCodes, VisibleError } from "../error";
import { getProvider } from "../git";
import type { NormalizedDirEntry, ProviderType } from "../git/provider/interface";
import { parseFrontmatter } from "../util/yaml";

const CONFIG_FILE_NAMES = {
  AGENTS: "AGENTS.md",
  CLAUDE: "CLAUDE.md",
} as const;

function normalizeDirname(filePath: string): string {
  const directory = path.dirname(filePath);
  return directory === "." ? "" : directory;
}

function normalizeConfigPath(input: string): string {
  const trimmed = input.trim();
  const normalized = path.normalize(trimmed);
  if (!trimmed || trimmed.startsWith("/") || trimmed.includes("\\")) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.INVALID_PARAMETER,
      "Config paths must be repository-relative",
    );
  }
  if (normalized !== trimmed || normalized === "." || normalized.startsWith("../")) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.INVALID_PARAMETER,
      "Config paths must stay within the repository",
    );
  }
  const name = path.basename(normalized);
  if (name !== CONFIG_FILE_NAMES.AGENTS && name !== CONFIG_FILE_NAMES.CLAUDE) {
    throw new VisibleError(
      "validation",
      ErrorCodes.Validation.INVALID_PARAMETER,
      "Only AGENTS.md and CLAUDE.md can be edited from this page",
    );
  }
  return normalized;
}

function configKindFromPath(filePath: string): AgentDiscovery.ConfigKind {
  const name = path.basename(filePath);
  if (name === CONFIG_FILE_NAMES.AGENTS) return "AGENTS";
  if (name === CONFIG_FILE_NAMES.CLAUDE) return "CLAUDE";
  throw new VisibleError(
    "validation",
    ErrorCodes.Validation.INVALID_PARAMETER,
    `Unsupported config file: ${filePath}`,
  );
}

function resolveSymlinkTarget(filePath: string, target: string | null | undefined): string | null {
  if (!target) return null;
  const normalizedTarget = target.trim();
  if (!normalizedTarget || normalizedTarget.startsWith("/")) return null;
  const directory = normalizeDirname(filePath);
  const resolved = path.normalize(directory ? path.join(directory, normalizedTarget) : normalizedTarget);
  if (!resolved || resolved === "." || resolved.startsWith("../")) return null;
  return resolved;
}

function maybeSymlinkTargetFromContent(content: string | null | undefined): string | null {
  const trimmed = content?.trim();
  if (!trimmed || trimmed.length > 240) return null;
  if (!/^(?:\.{1,2}\/)?[A-Za-z0-9._/-]+$/.test(trimmed)) return null;
  return trimmed;
}

function extractFrontmatterBlock(content: string): { yaml: string } | { error: string } | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return null;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return { error: "Frontmatter is missing a closing --- delimiter" };
  }
  return { yaml: trimmed.slice(3, end).trim() };
}

function detectFrontmatterSyntaxIssue(frontmatter: string): string | null {
  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("- ")) continue;
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const value = line.slice(colonIndex + 1).trim();
    if (
      (value.startsWith("[") && !value.endsWith("]")) ||
      (value.startsWith("{") && !value.endsWith("}")) ||
      (value.startsWith('"') && !value.endsWith('"')) ||
      (value.startsWith("'") && !value.endsWith("'"))
    ) {
      return `Invalid YAML frontmatter near \`${line}\``;
    }
  }
  return null;
}

function byPath(a: { path: string }, b: { path: string }) {
  return a.path.localeCompare(b.path);
}

export namespace AgentDiscovery {
  export interface RepoRef {
    source: ProviderType | string;
    fullName: string;
    defaultBranch?: string | null;
  }

  export const ConfigKind = z.enum(["AGENTS", "CLAUDE"]);
  export type ConfigKind = z.infer<typeof ConfigKind>;

  export const AgentFile = z.object({
    path: z.string(),
    sha: z.string(),
  });
  export type AgentFile = z.infer<typeof AgentFile>;

  export const ConfigFile = z.object({
    kind: ConfigKind,
    path: z.string(),
    sha: z.string(),
    isSymlink: z.boolean(),
    symlinkTarget: z.string().nullable(),
    resolvedPath: z.string().nullable(),
    editable: z.boolean(),
    collapsed: z.boolean(),
    collapsedInto: z.string().nullable(),
  });
  export type ConfigFile = z.infer<typeof ConfigFile>;

  export const AgentPairStatus = z.enum(["paired", "missing_claude"]);
  export type AgentPairStatus = z.infer<typeof AgentPairStatus>;

  export const AgentPair = z.object({
    directory: z.string(),
    status: AgentPairStatus,
    hasSymlink: z.boolean(),
    agents: ConfigFile,
    claude: ConfigFile.nullable(),
    hiddenSymlinkPaths: z.array(z.string()),
  });
  export type AgentPair = z.infer<typeof AgentPair>;

  export const ValidationIssue = z.object({
    level: z.enum(["error", "warning"]),
    message: z.string(),
  });
  export type ValidationIssue = z.infer<typeof ValidationIssue>;

  export const ValidationResult = z.object({
    path: z.string(),
    valid: z.boolean(),
    issues: z.array(ValidationIssue),
  });
  export type ValidationResult = z.infer<typeof ValidationResult>;

  export const AgentsFolderInfo = z.object({
    exists: z.boolean(),
    entries: z.array(z.string()),
  });
  export type AgentsFolderInfo = z.infer<typeof AgentsFolderInfo>;

  function resolveRef(repo: RepoRef, ref?: string): string {
    return ref ?? repo.defaultBranch ?? "HEAD";
  }

  function isConfigFilePath(filePath: string) {
    const name = path.basename(filePath);
    return name === CONFIG_FILE_NAMES.AGENTS || name === CONFIG_FILE_NAMES.CLAUDE;
  }

  /**
   * Find all AGENTS.md files in a repo via recursive tree search.
   */
  export async function findAgentFiles(repo: RepoRef, ref?: string): Promise<AgentFile[]> {
    return (await findConfigFiles(repo, ref))
      .filter((entry) => entry.kind === "AGENTS")
      .map((entry) => ({ path: entry.path, sha: entry.sha }));
  }

  async function findConfigFiles(repo: RepoRef, ref?: string): Promise<ConfigFile[]> {
    const provider = getProvider(repo.source);
    const resolvedRef = resolveRef(repo, ref);
    const tree = await provider.repos.getTree(repo.fullName, resolvedRef);
    const configs = tree
      .filter((entry) => entry.type === "blob" && isConfigFilePath(entry.path))
      .sort(byPath);

    if (configs.length === 0) return [];

    const directories = [...new Set(configs.map((entry) => normalizeDirname(entry.path)))];
    const directoryMaps = new Map<string, Map<string, NormalizedDirEntry>>();
    const listings = await Promise.all(
      directories.map(async (directory) => {
        const entries = await provider.content.listDir(repo.fullName, directory, resolvedRef);
        const map = new Map((entries ?? []).map((entry) => [entry.path, entry]));
        return [directory, map] as const;
      }),
    );
    for (const [directory, map] of listings) {
      directoryMaps.set(directory, map);
    }

    const fallbackTargets = await Promise.all(
      configs.map(async (entry) => {
        if (entry.mode !== "120000") return null;
        const file = await provider.content.readFile(repo.fullName, entry.path, resolvedRef);
        return maybeSymlinkTargetFromContent(file?.content);
      }),
    );

    const files = configs.map((entry, index) => {
      const directory = normalizeDirname(entry.path);
      const dirEntry = directoryMaps.get(directory)?.get(entry.path);
      const isSymlink = entry.mode === "120000" || dirEntry?.type === "symlink";
      const symlinkTarget = dirEntry?.target ?? fallbackTargets[index] ?? null;
      const resolvedPath = isSymlink ? resolveSymlinkTarget(entry.path, symlinkTarget) : null;
      return {
        kind: configKindFromPath(entry.path),
        path: entry.path,
        sha: entry.sha,
        isSymlink,
        symlinkTarget,
        resolvedPath,
        editable: !isSymlink,
        collapsed: false,
        collapsedInto: null,
      } satisfies ConfigFile;
    });

    const fileByPath = new Map(files.map((file) => [file.path, file]));
    return files.map((file) => {
      if (!file.isSymlink || !file.resolvedPath) return file;
      const target = fileByPath.get(file.resolvedPath);
      if (!target || target.kind !== file.kind) return file;
      return {
        ...file,
        collapsed: true,
        collapsedInto: target.path,
      } satisfies ConfigFile;
    });
  }

  export function pairConfigFiles(files: ConfigFile[]): AgentPair[] {
    const visibleFiles = files.filter((file) => !file.collapsed);
    const fileByPath = new Map(visibleFiles.map((file) => [file.path, file]));
    const hiddenSymlinkPaths = new Map<string, string[]>();

    for (const file of files) {
      if (!file.collapsedInto) continue;
      const list = hiddenSymlinkPaths.get(file.collapsedInto) ?? [];
      list.push(file.path);
      hiddenSymlinkPaths.set(file.collapsedInto, list);
    }

    return visibleFiles
      .filter((file) => file.kind === "AGENTS")
      .sort(byPath)
      .map((agents) => {
        const directory = normalizeDirname(agents.path);
        const claudePath = directory
          ? path.join(directory, CONFIG_FILE_NAMES.CLAUDE)
          : CONFIG_FILE_NAMES.CLAUDE;
        const claude = fileByPath.get(claudePath) ?? null;
        const hidden = [
          ...(hiddenSymlinkPaths.get(agents.path) ?? []),
          ...(claude ? (hiddenSymlinkPaths.get(claude.path) ?? []) : []),
        ].sort();
        return {
          directory,
          status: claude ? "paired" : "missing_claude",
          hasSymlink: agents.isSymlink || !!claude?.isSymlink || hidden.length > 0,
          agents,
          claude,
          hiddenSymlinkPaths: hidden,
        } satisfies AgentPair;
      });
  }

  export async function findConfigPairs(repo: RepoRef, ref?: string): Promise<AgentPair[]> {
    return pairConfigFiles(await findConfigFiles(repo, ref));
  }

  /**
   * Read a single file's content from a repo.
   */
  export async function readFile(
    repo: RepoRef,
    filePath: string,
    ref?: string,
  ): Promise<string | null> {
    const file = await getProvider(repo.source).content.readFile(repo.fullName, filePath, ref);
    return file?.content ?? null;
  }

  export function assertConfigPath(filePath: string): string {
    return normalizeConfigPath(filePath);
  }

  export function validateFile(filePath: string, content: string): ValidationResult {
    const normalizedPath = normalizeConfigPath(filePath);
    const issues: ValidationIssue[] = [];

    if (!content.trim()) {
      issues.push({
        level: "error",
        message: `${path.basename(normalizedPath)} cannot be empty`,
      });
    }

    const frontmatter = extractFrontmatterBlock(content);
    if (frontmatter && "error" in frontmatter) {
      issues.push({
        level: "error",
        message: frontmatter.error,
      });
    } else if (frontmatter && "yaml" in frontmatter) {
      const syntaxIssue = detectFrontmatterSyntaxIssue(frontmatter.yaml);
      if (syntaxIssue) {
        issues.push({
          level: "error",
          message: syntaxIssue,
        });
      } else {
        try {
          parseFrontmatter(content);
        } catch (error) {
          issues.push({
            level: "error",
            message:
              error instanceof Error
                ? `Invalid YAML frontmatter: ${error.message}`
                : "Invalid YAML frontmatter",
          });
        }
      }
    }

    if (content.length > 50_000) {
      issues.push({
        level: "warning",
        message: `${path.basename(normalizedPath)} is very large and may be hard to review in the console`,
      });
    }

    return {
      path: normalizedPath,
      valid: issues.every((issue) => issue.level !== "error"),
      issues,
    };
  }

  export function generateClaudeFile(input: {
    agentsPath: string;
    agentsContent: string;
    instructions?: string;
  }): string {
    const agentsPath = normalizeConfigPath(input.agentsPath);
    const extraInstructions = input.instructions?.trim();
    const lines = [
      "# CLAUDE.md",
      "",
      `This file mirrors the working guidance from \`${path.basename(agentsPath)}\` for Claude-based agents.`,
      "",
    ];

    if (extraInstructions) {
      lines.push("## Additional context", "", extraInstructions, "");
    }

    lines.push("## Mirrored guidance", "", input.agentsContent.trim(), "");
    return lines.join("\n");
  }

  /**
   * Check if .agents/ folder exists and return its top-level structure.
   */
  export async function detectAgentsFolder(
    repo: RepoRef,
    ref?: string,
  ): Promise<AgentsFolderInfo | null> {
    const entries = await getProvider(repo.source).content.listDir(repo.fullName, ".agents", ref);
    if (!entries) return null;
    return {
      exists: true,
      entries: entries.map((e) => e.name),
    };
  }

  /**
   * Check if .claude/ folder exists and return its file paths.
   */
  export async function detectClaudeFolder(repo: RepoRef, ref?: string): Promise<string[]> {
    const entries = await getProvider(repo.source).content.listDir(repo.fullName, ".claude", ref);
    if (!entries) return [];
    return entries.map((e) => e.path);
  }
}
