import { GithubContent } from "../github/repo/content";
import { z } from "zod";

export namespace AgentDiscovery {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
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

  /**
   * Find all AGENTS.md files in a repo via recursive tree search.
   */
  export async function findAgentFiles(
    repo: RepoRef,
    ref?: string,
  ): Promise<AgentFile[]> {
    const tree = await GithubContent.getTree(repo, ref);
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
    return GithubContent.readFile(repo, path, ref);
  }

  /**
   * Check if .agents/ folder exists and return its top-level structure.
   */
  export async function detectAgentsFolder(
    repo: RepoRef,
    ref?: string,
  ): Promise<AgentsFolderInfo | null> {
    const entries = await GithubContent.listDir(repo, ".agents", ref);
    if (!entries) return null;
    return {
      exists: true,
      entries: entries.map((e) => e.name),
    };
  }

  /**
   * Check if .claude/ folder exists and return its file paths.
   */
  export async function detectClaudeFolder(
    repo: RepoRef,
    ref?: string,
  ): Promise<string[]> {
    const entries = await GithubContent.listDir(repo, ".claude", ref);
    if (!entries) return [];
    return entries.map((e) => e.path);
  }
}
