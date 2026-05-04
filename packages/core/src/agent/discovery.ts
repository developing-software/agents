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
    dir: string;
    agentsPath: string;
    claudePath: string;
    agentsSha: string;
    claudeSha: string | null;
    isAgentsSymlink: boolean;
    isClaudeSymlink: boolean;
    existsClaude: boolean;
  }

  function resolveRef(repo: RepoRef, ref?: string): string {
    return ref ?? repo.defaultBranch ?? "HEAD";
  }

  function dirOf(path: string): string {
    const idx = path.lastIndexOf("/");
    return idx === -1 ? "" : path.slice(0, idx);
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
   * Find AGENTS.md files and pair each with the CLAUDE.md in the same directory.
   * Symlinks are detected from the git tree mode field (mode 120000).
   */
  export async function findAgentPairs(repo: RepoRef, ref?: string): Promise<AgentPair[]> {
    const tree = await getProvider(repo.source).repos.getTree(repo.fullName, resolveRef(repo, ref));

    const agentsEntries = tree.filter(
      (e) => e.type === "blob" && (e.path === "AGENTS.md" || e.path.endsWith("/AGENTS.md")),
    );
    const claudeEntries = tree.filter(
      (e) => e.type === "blob" && (e.path === "CLAUDE.md" || e.path.endsWith("/CLAUDE.md")),
    );

    const claudeByDir = new Map<string, (typeof claudeEntries)[0]>();
    for (const c of claudeEntries) {
      claudeByDir.set(dirOf(c.path), c);
    }

    return agentsEntries
      .map((a) => {
        const dir = dirOf(a.path);
        const claudeEntry = claudeByDir.get(dir);
        return {
          dir,
          agentsPath: a.path,
          claudePath: dir ? `${dir}/CLAUDE.md` : "CLAUDE.md",
          agentsSha: a.sha,
          claudeSha: claudeEntry?.sha ?? null,
          isAgentsSymlink: a.isSymlink ?? false,
          isClaudeSymlink: claudeEntry?.isSymlink ?? false,
          existsClaude: !!claudeEntry,
        };
      })
      .sort((a, b) => a.agentsPath.localeCompare(b.agentsPath));
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
