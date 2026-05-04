import { z } from "zod";
import { getProvider } from "../git";
import type { ProviderType } from "../git/provider/interface";

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

  export const AgentsFolderInfo = z.object({
    exists: z.boolean(),
    entries: z.array(z.string()),
  });
  export type AgentsFolderInfo = z.infer<typeof AgentsFolderInfo>;

  export interface AgentPair {
    directory: string;
    agents: { path: string; sha: string; isSymlink: boolean } | null;
    claude: { path: string; sha: string; isSymlink: boolean } | null;
  }

  function resolveRef(repo: RepoRef, ref?: string): string {
    return ref ?? repo.defaultBranch ?? "HEAD";
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
   * Find all AGENTS.md ↔ CLAUDE.md pairs across a repo.
   * For each directory containing either file, returns both entries with symlink status.
   */
  export async function findAgentPairs(repo: RepoRef, ref?: string): Promise<AgentPair[]> {
    const resolvedRef = resolveRef(repo, ref);
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolvedRef);

    const agentsMap = new Map<string, { path: string; sha: string }>();
    const claudeMap = new Map<string, { path: string; sha: string }>();

    for (const entry of tree) {
      if (entry.type !== "blob") continue;
      const name = entry.path.split("/").pop();
      if (name !== "AGENTS.md" && name !== "CLAUDE.md") continue;
      const dir = entry.path === name ? "." : entry.path.slice(0, -(name.length + 1));
      if (name === "AGENTS.md") agentsMap.set(dir, { path: entry.path, sha: entry.sha });
      else claudeMap.set(dir, { path: entry.path, sha: entry.sha });
    }

    const allDirs = new Set([...agentsMap.keys(), ...claudeMap.keys()]);
    const dirsToCheck = [...allDirs];

    const provider = getProvider(repo.source);
    const symlinkResults = await Promise.all(
      dirsToCheck.map(async (dir) => {
        const listPath = dir === "." ? "" : dir;
        const entries = await provider.content.listDir(repo.fullName, listPath, resolvedRef);
        const symlinkSet = new Set<string>();
        if (entries) {
          for (const e of entries) {
            if (e.type === "symlink") symlinkSet.add(e.name);
          }
        }
        return { dir, symlinkSet };
      }),
    );

    const symlinkByDir = new Map<string, Set<string>>();
    for (const { dir, symlinkSet } of symlinkResults) {
      symlinkByDir.set(dir, symlinkSet);
    }

    const pairs: AgentPair[] = [];
    for (const dir of [...allDirs].sort()) {
      const symlinks = symlinkByDir.get(dir) ?? new Set();
      const agentsEntry = agentsMap.get(dir);
      const claudeEntry = claudeMap.get(dir);

      pairs.push({
        directory: dir,
        agents: agentsEntry
          ? { ...agentsEntry, isSymlink: symlinks.has("AGENTS.md") }
          : null,
        claude: claudeEntry
          ? { ...claudeEntry, isSymlink: symlinks.has("CLAUDE.md") }
          : null,
      });
    }

    return pairs;
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
