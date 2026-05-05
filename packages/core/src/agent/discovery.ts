import { posix } from "node:path";
import { z } from "zod";
import { getProvider } from "../git";
import type { NormalizedDirEntry, NormalizedTreeEntry } from "../git";
import type { ProviderType } from "../git/provider/interface";

export namespace AgentDiscovery {
  const ConfigFileName = z.enum(["AGENTS.md", "CLAUDE.md"]);
  type ConfigFileName = z.infer<typeof ConfigFileName>;

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

  export const AgentsFolderInfo = z.object({
    exists: z.boolean(),
    entries: z.array(z.string()),
  });
  export type AgentsFolderInfo = z.infer<typeof AgentsFolderInfo>;

  export const ConfigFile = z.object({
    name: ConfigFileName,
    path: z.string(),
    sha: z.string(),
    isSymlink: z.boolean(),
    targetPath: z.string().nullable(),
    originalPath: z.string(),
  });
  export type ConfigFile = z.infer<typeof ConfigFile>;

  export const ConfigPair = z.object({
    directory: z.string(),
    agents: ConfigFile.nullable(),
    claude: ConfigFile.nullable(),
    status: z.enum(["paired", "missing_agents", "missing_claude"]),
    hasSymlink: z.boolean(),
  });
  export type ConfigPair = z.infer<typeof ConfigPair>;

  function resolveRef(repo: RepoRef, ref?: string): string {
    return ref ?? repo.defaultBranch ?? "HEAD";
  }

  function directoryOf(path: string): string {
    const directory = posix.dirname(path);
    return directory === "." ? "" : directory;
  }

  function fileNameOf(path: string): ConfigFileName | null {
    const name = posix.basename(path);
    return ConfigFileName.safeParse(name).success ? (name as ConfigFileName) : null;
  }

  function normalizeSymlinkTarget(directory: string, target?: string): string | null {
    if (!target || target.startsWith("/")) return null;
    const normalized = posix.normalize(posix.join(directory || ".", target));
    if (normalized === ".") return null;
    if (normalized === ".." || normalized.startsWith("../")) return null;
    return normalized;
  }

  function isConfigTreeEntry(entry: NormalizedTreeEntry): boolean {
    const fileName = fileNameOf(entry.path);
    if (!fileName) return false;
    return entry.type === "blob" || entry.type === "symlink";
  }

  function indexDirEntries(
    directoryEntriesByDir: Record<string, NormalizedDirEntry[] | null>,
  ): Map<string, NormalizedDirEntry> {
    const index = new Map<string, NormalizedDirEntry>();
    for (const [directory, entries] of Object.entries(directoryEntriesByDir)) {
      for (const entry of entries ?? []) {
        const path = directory ? `${directory}/${entry.name}` : entry.name;
        index.set(path, entry);
      }
    }
    return index;
  }

  function toConfigFile(
    entry: NormalizedTreeEntry,
    dirEntryIndex: Map<string, NormalizedDirEntry>,
  ): ConfigFile {
    const name = fileNameOf(entry.path);
    if (!name) {
      throw new Error(`Unsupported config file path: ${entry.path}`);
    }

    const directoryEntry = dirEntryIndex.get(entry.path);
    const isSymlink = entry.type === "symlink" || directoryEntry?.type === "symlink";
    const targetPath = isSymlink ? normalizeSymlinkTarget(directoryOf(entry.path), directoryEntry?.target) : null;

    return {
      name,
      path: entry.path,
      sha: entry.sha,
      isSymlink,
      targetPath,
      originalPath: targetPath ?? entry.path,
    };
  }

  export function buildConfigPairs(
    tree: NormalizedTreeEntry[],
    directoryEntriesByDir: Record<string, NormalizedDirEntry[] | null> = {},
  ): ConfigPair[] {
    const dirEntryIndex = indexDirEntries(directoryEntriesByDir);
    const byDirectory = new Map<
      string,
      {
        agents: ConfigFile | null;
        claude: ConfigFile | null;
      }
    >();

    const configEntries = tree
      .filter(isConfigTreeEntry)
      .sort((left, right) => left.path.localeCompare(right.path));

    for (const entry of configEntries) {
      const name = fileNameOf(entry.path);
      if (!name) continue;

      const directory = directoryOf(entry.path);
      const bucket = byDirectory.get(directory) ?? { agents: null, claude: null };
      const file = toConfigFile(entry, dirEntryIndex);
      if (name === "AGENTS.md") bucket.agents = file;
      if (name === "CLAUDE.md") bucket.claude = file;
      byDirectory.set(directory, bucket);
    }

    return Array.from(byDirectory.entries())
      .map(([directory, bucket]) => {
        const status: ConfigPair["status"] = bucket.agents && bucket.claude
          ? "paired"
          : bucket.agents
            ? "missing_claude"
            : "missing_agents";

        return {
          directory,
          agents: bucket.agents,
          claude: bucket.claude,
          status,
          hasSymlink: !!bucket.agents?.isSymlink || !!bucket.claude?.isSymlink,
        };
      })
      .sort((left, right) => {
        const leftPath = left.directory || left.agents?.path || left.claude?.path || "";
        const rightPath = right.directory || right.agents?.path || right.claude?.path || "";
        return leftPath.localeCompare(rightPath);
      });
  }

  async function readConfigDirectoryEntries(
    repo: RepoRef,
    ref: string,
    tree: NormalizedTreeEntry[],
  ): Promise<Record<string, NormalizedDirEntry[] | null>> {
    const provider = getProvider(repo.source);
    const directories = [...new Set(tree.filter(isConfigTreeEntry).map((entry) => directoryOf(entry.path)))];

    const results = await Promise.all(
      directories.map(async (directory) => {
        try {
          const entries = await provider.content.listDir(repo.fullName, directory, ref);
          return [directory, entries] as const;
        } catch {
          return [directory, null] as const;
        }
      }),
    );

    return Object.fromEntries(results);
  }

  export async function findConfigPairs(repo: RepoRef, ref?: string): Promise<ConfigPair[]> {
    const resolved = resolveRef(repo, ref);
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolved);
    const directoryEntriesByDir = await readConfigDirectoryEntries(repo, resolved, tree);
    return buildConfigPairs(tree, directoryEntriesByDir);
  }

  /**
   * Find all AGENTS.md files in a repo via recursive tree search.
   */
  export async function findAgentFiles(repo: RepoRef, ref?: string): Promise<AgentFile[]> {
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolveRef(repo, ref));
    return tree
      .filter(
        (entry) =>
          entry.type === "blob" &&
          (entry.path.endsWith("/AGENTS.md") || entry.path === "AGENTS.md"),
      )
      .map((entry) => ({ path: entry.path, sha: entry.sha }));
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
