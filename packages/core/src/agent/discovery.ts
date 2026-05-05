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

  export const AgentPair = z.object({
    directory: z.string(),
    agentsPath: z.string(),
    claudePath: z.string(),
    agentsSha: z.string(),
    claudeSha: z.string().nullable(),
    isAgentsSymlink: z.boolean(),
    isClaudeSymlink: z.boolean(),
    existsClaude: z.boolean(),
  });
  export type AgentPair = z.infer<typeof AgentPair>;

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
   * Find all AGENTS.md files and their paired CLAUDE.md in the same directory.
   * Includes symlink detection via directory listings.
   */
  export async function findAgentPairs(repo: RepoRef, ref?: string): Promise<AgentPair[]> {
    const provider = getProvider(repo.source);
    const resolvedRef = resolveRef(repo, ref);

    const tree = await provider.repos.getTree(repo.fullName, resolvedRef);

    const agentsByDir = new Map<string, string>();
    const claudeByDir = new Map<string, string>();

    for (const entry of tree) {
      if (entry.type !== "blob") continue;
      if (entry.path === "AGENTS.md" || entry.path.endsWith("/AGENTS.md")) {
        const dir =
          entry.path === "AGENTS.md" ? "" : entry.path.slice(0, -(1 + "AGENTS.md".length));
        agentsByDir.set(dir, entry.sha);
      }
      if (entry.path === "CLAUDE.md" || entry.path.endsWith("/CLAUDE.md")) {
        const dir =
          entry.path === "CLAUDE.md" ? "" : entry.path.slice(0, -(1 + "CLAUDE.md".length));
        claudeByDir.set(dir, entry.sha);
      }
    }

    // Fetch directory listings to detect symlinks
    const dirListings = new Map<string, Map<string, string>>();
    await Promise.all(
      [...agentsByDir.keys()].map(async (dir) => {
        const entries = await provider.content.listDir(repo.fullName, dir, resolvedRef);
        if (!entries) return;
        const names = new Map<string, string>();
        for (const e of entries) names.set(e.name, e.type);
        dirListings.set(dir, names);
      }),
    );

    const pairs: AgentPair[] = [];

    for (const [dir, agentsSha] of agentsByDir) {
      const agentsPath = dir === "" ? "AGENTS.md" : `${dir}/AGENTS.md`;
      const claudePath = dir === "" ? "CLAUDE.md" : `${dir}/CLAUDE.md`;
      const claudeSha = claudeByDir.get(dir) ?? null;
      const listing = dirListings.get(dir);

      pairs.push({
        directory: dir,
        agentsPath,
        claudePath,
        agentsSha,
        claudeSha,
        isAgentsSymlink: listing?.get("AGENTS.md") === "symlink",
        isClaudeSymlink: listing?.get("CLAUDE.md") === "symlink",
        existsClaude: claudeSha !== null,
      });
    }

    return pairs.sort((a, b) => a.directory.localeCompare(b.directory));
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
   * Read both AGENTS.md and CLAUDE.md for a pair, returning their content and SHAs.
   */
  export async function readPairContent(
    repo: RepoRef,
    agentsPath: string,
    claudePath: string,
    ref?: string,
  ): Promise<{
    agentsContent: string | null;
    agentsSha: string | null;
    claudeContent: string | null;
    claudeSha: string | null;
  }> {
    const provider = getProvider(repo.source);
    const [agentsFile, claudeFile] = await Promise.all([
      provider.content.readFile(repo.fullName, agentsPath, ref),
      provider.content.readFile(repo.fullName, claudePath, ref),
    ]);
    return {
      agentsContent: agentsFile?.content ?? null,
      agentsSha: agentsFile?.sha ?? null,
      claudeContent: claudeFile?.content ?? null,
      claudeSha: claudeFile?.sha ?? null,
    };
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
