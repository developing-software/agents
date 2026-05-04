import { z } from "zod";
import { getProvider } from "../git";
import type { NormalizedTreeEntry, ProviderType } from "../git/provider/interface";

export namespace AgentDiscovery {
  export interface RepoRef {
    source: ProviderType | string;
    fullName: string;
    defaultBranch?: string | null;
  }

  export const AgentFile = z.object({
    path: z.string(),
    sha: z.string(),
  });
  export type AgentFile = z.infer<typeof AgentFile>;

  export const ConfigFile = z.object({
    path: z.string(),
    sha: z.string(),
    canonicalPath: z.string(),
    isSymlink: z.boolean(),
    symlinkTarget: z.string().nullable(),
  });
  export type ConfigFile = z.infer<typeof ConfigFile>;

  export const PairAlias = z.object({
    kind: z.enum(["agents", "claude"]),
    path: z.string(),
    canonicalPath: z.string(),
  });
  export type PairAlias = z.infer<typeof PairAlias>;

  export const ConfigPair = z.object({
    directory: z.string(),
    agents: ConfigFile,
    claude: ConfigFile.nullable(),
    status: z.enum(["paired", "missing_claude"]),
    aliases: z.array(PairAlias),
  });
  export type ConfigPair = z.infer<typeof ConfigPair>;

  export const AgentsFolderInfo = z.object({
    exists: z.boolean(),
    entries: z.array(z.string()),
  });
  export type AgentsFolderInfo = z.infer<typeof AgentsFolderInfo>;

  function resolveRef(repo: RepoRef, ref?: string): string {
    return ref ?? repo.defaultBranch ?? "HEAD";
  }

  function basename(path: string): string {
    const parts = path.split("/");
    return parts[parts.length - 1] ?? path;
  }

  function dirname(path: string): string {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? "" : path.slice(0, idx);
  }

  function normalizePath(path: string): string {
    const normalized: string[] = [];
    for (const segment of path.split("/")) {
      if (!segment || segment === ".") continue;
      if (segment === "..") {
        normalized.pop();
        continue;
      }
      normalized.push(segment);
    }
    return normalized.join("/");
  }

  export function resolveSymlinkPath(path: string, targetPath?: string | null): string | null {
    if (!targetPath) return null;
    const target = targetPath.trim();
    if (!target) return null;
    if (target.startsWith("/")) return normalizePath(target.slice(1));
    return normalizePath([dirname(path), target].filter(Boolean).join("/"));
  }

  type ConfigKind = "agents" | "claude";
  type ConfigCandidate = ConfigFile & { kind: ConfigKind };

  export function matchConfigPairs(
    entries: NormalizedTreeEntry[],
    symlinkTargets: Record<string, string | null> = {},
  ): ConfigPair[] {
    const groups = new Map<
      string,
      {
        kind: ConfigKind;
        display: ConfigCandidate;
        aliases: PairAlias[];
      }
    >();

    for (const entry of entries) {
      const name = basename(entry.path);
      const kind: ConfigKind | null =
        name === "AGENTS.md" ? "agents" : name === "CLAUDE.md" ? "claude" : null;
      if (!kind || entry.type === "tree") continue;

      const isSymlink = entry.type === "symlink";
      const symlinkTarget = isSymlink ? (symlinkTargets[entry.path] ?? null) : null;
      const canonicalPath = resolveSymlinkPath(entry.path, symlinkTarget) ?? entry.path;
      const candidate: ConfigCandidate = {
        kind,
        path: entry.path,
        sha: entry.sha,
        canonicalPath,
        isSymlink,
        symlinkTarget,
      };

      const groupKey = `${kind}:${canonicalPath}`;
      const group = groups.get(groupKey);
      if (!group) {
        groups.set(groupKey, {
          kind,
          display: candidate,
          aliases:
            isSymlink && canonicalPath !== entry.path
              ? [{ kind, path: entry.path, canonicalPath }]
              : [],
        });
        continue;
      }

      if (group.display.isSymlink && !candidate.isSymlink) {
        group.display = candidate;
      }

      if (isSymlink && canonicalPath !== entry.path) {
        group.aliases.push({ kind, path: entry.path, canonicalPath });
      }
    }

    const claudeByDirectory = new Map<
      string,
      {
        display: ConfigCandidate;
        aliases: PairAlias[];
      }
    >();

    for (const [, group] of groups) {
      if (group.kind !== "claude") continue;
      claudeByDirectory.set(dirname(group.display.canonicalPath), {
        display: group.display,
        aliases: group.aliases,
      });
    }

    const pairs: ConfigPair[] = [];
    for (const [, group] of groups) {
      if (group.kind !== "agents") continue;
      const directory = dirname(group.display.canonicalPath);
      const claude = claudeByDirectory.get(directory);
      pairs.push({
        directory,
        agents: group.display,
        claude: claude?.display ?? null,
        status: claude ? "paired" : "missing_claude",
        aliases: [...group.aliases, ...(claude?.aliases ?? [])],
      });
    }

    return pairs.sort((a, b) => a.directory.localeCompare(b.directory));
  }

  /**
   * Find all AGENTS.md files in a repo via recursive tree search.
   */
  export async function findAgentFiles(repo: RepoRef, ref?: string): Promise<AgentFile[]> {
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolveRef(repo, ref));
    return tree
      .filter(
        (entry) =>
          entry.type !== "tree" &&
          (entry.path.endsWith("/AGENTS.md") || entry.path === "AGENTS.md"),
      )
      .map((entry) => ({ path: entry.path, sha: entry.sha }));
  }

  async function readSymlinkTargets(
    repo: RepoRef,
    ref: string,
    entries: NormalizedTreeEntry[],
  ): Promise<Record<string, string | null>> {
    const provider = getProvider(repo.source);
    const targets = await Promise.all(
      entries
        .filter((entry) => entry.type === "symlink")
        .map(async (entry) => {
          try {
            const blob = await provider.repos.getBlob(repo.fullName, ref, entry.path);
            return [entry.path, blob.content.trim() || null] as const;
          } catch {
            return [entry.path, null] as const;
          }
        }),
    );
    return Object.fromEntries(targets);
  }

  export async function findConfigPairs(repo: RepoRef, ref?: string): Promise<ConfigPair[]> {
    const resolvedRef = resolveRef(repo, ref);
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolvedRef);
    const configEntries = tree.filter((entry) => {
      const name = basename(entry.path);
      return (name === "AGENTS.md" || name === "CLAUDE.md") && entry.type !== "tree";
    });

    const symlinkTargets = await readSymlinkTargets(repo, resolvedRef, configEntries);
    return matchConfigPairs(configEntries, symlinkTargets);
  }

  /**
   * Read a single file's content from a repo.
   */
  export async function readFile(
    repo: RepoRef,
    path: string,
    ref?: string,
  ): Promise<string | null> {
    const file = await getProvider(repo.source).content.readFile(repo.fullName, path, ref);
    return file?.content ?? null;
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
