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

  export const AgentsFolderInfo = z.object({
    exists: z.boolean(),
    entries: z.array(z.string()),
  });
  export type AgentsFolderInfo = z.infer<typeof AgentsFolderInfo>;

  export interface AgentPair {
    directory: string;
    agentsPath: string | null;
    claudePath: string | null;
    agentsSha: string | null;
    claudeSha: string | null;
    agentsIsSymlink: boolean;
    claudeIsSymlink: boolean;
    symlinkTarget: string | null;
  }

  function resolveRef(repo: RepoRef, ref?: string): string {
    return ref ?? repo.defaultBranch ?? "HEAD";
  }

  function dirOf(path: string): string {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? "" : path.substring(0, idx);
  }

  export function matchPairsFromTree(
    tree: NormalizedTreeEntry[],
  ): Omit<AgentPair, "symlinkTarget">[] {
    const agentsFiles = new Map<string, { path: string; sha: string; isSymlink: boolean }>();
    const claudeFiles = new Map<string, { path: string; sha: string; isSymlink: boolean }>();

    for (const entry of tree) {
      if (entry.type !== "blob") continue;

      const name = entry.path.split("/").pop();
      if (name !== "AGENTS.md" && name !== "CLAUDE.md") continue;

      const dir = dirOf(entry.path);
      const info = { path: entry.path, sha: entry.sha, isSymlink: entry.isSymlink ?? false };

      if (name === "AGENTS.md") {
        agentsFiles.set(dir, info);
      } else {
        claudeFiles.set(dir, info);
      }
    }

    const allDirs = new Set([...agentsFiles.keys(), ...claudeFiles.keys()]);
    const pairs: Omit<AgentPair, "symlinkTarget">[] = [];

    for (const dir of allDirs) {
      const agent = agentsFiles.get(dir);
      const claude = claudeFiles.get(dir);

      pairs.push({
        directory: dir || ".",
        agentsPath: agent?.path ?? null,
        claudePath: claude?.path ?? null,
        agentsSha: agent?.sha ?? null,
        claudeSha: claude?.sha ?? null,
        agentsIsSymlink: agent?.isSymlink ?? false,
        claudeIsSymlink: claude?.isSymlink ?? false,
      });
    }

    pairs.sort((a, b) => a.directory.localeCompare(b.directory));
    return pairs;
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
   * Find all AGENTS.md ↔ CLAUDE.md pairs in a repo with symlink detection.
   */
  export async function findAgentPairs(repo: RepoRef, ref?: string): Promise<AgentPair[]> {
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolveRef(repo, ref));
    const matched = matchPairsFromTree(tree);

    const pairs: AgentPair[] = [];
    for (const m of matched) {
      let symlinkTarget: string | null = null;
      if (m.agentsIsSymlink || m.claudeIsSymlink) {
        const symlinkPath = m.agentsIsSymlink ? m.agentsPath : m.claudeIsSymlink ? m.claudePath : null;
        if (symlinkPath) {
          const content = await readFile(repo, symlinkPath, ref);
          if (content) symlinkTarget = content.trim();
        }
      }
      pairs.push({ ...m, symlinkTarget });
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
