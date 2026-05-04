import { z } from "zod";
import { getProvider } from "../git";
import type { DirEntryKind, ProviderType } from "../git/provider/interface";

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

  export const AgentPair = z.object({
    dir: z.string(),
    agentsPath: z.string(),
    claudePath: z.string(),
    agentsExists: z.boolean(),
    claudeExists: z.boolean(),
    agentsIsSymlink: z.boolean(),
    claudeIsSymlink: z.boolean(),
  });
  export type AgentPair = z.infer<typeof AgentPair>;

  /**
   * Pure matching function: builds AgentPair list from tree entries and a dir→entries map.
   * Exported for unit testing without requiring a live git provider.
   */
  export function buildPairsFromTree(
    tree: { type: string; path: string }[],
    dirEntryMap: Map<string, Map<string, DirEntryKind>>,
  ): AgentPair[] {
    const agentsPaths = tree
      .filter(
        (e) =>
          e.type === "blob" && (e.path === "AGENTS.md" || e.path.endsWith("/AGENTS.md")),
      )
      .map((e) => e.path);

    const claudePathSet = new Set(
      tree
        .filter(
          (e) =>
            e.type === "blob" && (e.path === "CLAUDE.md" || e.path.endsWith("/CLAUDE.md")),
        )
        .map((e) => e.path),
    );

    return agentsPaths
      .map((agentsPath) => {
        const dir = agentsPath.includes("/")
          ? agentsPath.slice(0, agentsPath.lastIndexOf("/"))
          : "";
        const claudePath = dir ? `${dir}/CLAUDE.md` : "CLAUDE.md";
        const entries = dirEntryMap.get(dir);
        return {
          dir,
          agentsPath,
          claudePath,
          agentsExists: true,
          claudeExists: claudePathSet.has(claudePath),
          agentsIsSymlink: entries?.get("AGENTS.md") === "symlink",
          claudeIsSymlink: entries?.get("CLAUDE.md") === "symlink",
        };
      })
      .sort((a, b) => a.dir.localeCompare(b.dir));
  }

  /**
   * Find all AGENTS.md files and their paired CLAUDE.md in the same directory.
   * Symlink status is detected via per-directory listings.
   */
  export async function findAgentPairs(repo: RepoRef, ref?: string): Promise<AgentPair[]> {
    const resolvedRef = resolveRef(repo, ref);
    const provider = getProvider(repo.source);
    const tree = await provider.repos.getTree(repo.fullName, resolvedRef);

    const dirs = new Set(
      tree
        .filter(
          (e) => e.type === "blob" && (e.path === "AGENTS.md" || e.path.endsWith("/AGENTS.md")),
        )
        .map((e) => (e.path.includes("/") ? e.path.slice(0, e.path.lastIndexOf("/")) : "")),
    );

    const dirEntryMap = new Map<string, Map<string, DirEntryKind>>();
    await Promise.all(
      [...dirs].map(async (dir) => {
        const entries = await provider.content.listDir(
          repo.fullName,
          dir || ".",
          resolvedRef,
        );
        if (entries) {
          dirEntryMap.set(dir, new Map(entries.map((e) => [e.name, e.type])));
        }
      }),
    );

    return buildPairsFromTree(tree, dirEntryMap);
  }

  /**
   * Read a file's content and its current SHA (needed for updates).
   */
  export async function readFileWithSha(
    repo: RepoRef,
    path: string,
    ref?: string,
  ): Promise<{ content: string; sha: string } | null> {
    const file = await getProvider(repo.source).content.readFile(repo.fullName, path, ref);
    return file ?? null;
  }

  /**
   * Write or update a file. Provide sha when updating an existing file.
   */
  export async function writeAgentFile(
    repo: RepoRef,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<void> {
    await getProvider(repo.source).content.writeFile(repo.fullName, {
      path,
      content,
      message,
      sha,
    });
  }

  /**
   * Generate a starter CLAUDE.md template for the given AGENTS.md path.
   */
  export function generateClaudeTemplate(agentsPath: string): string {
    const dir = agentsPath.includes("/")
      ? agentsPath.slice(0, agentsPath.lastIndexOf("/"))
      : "";
    const scope = dir || "root";
    return [
      `# Claude Instructions`,
      ``,
      `This file provides context and instructions for Claude agents working in \`${scope}\`.`,
      ``,
      `## Scope`,
      ``,
      `This configuration applies to the \`${scope}\` directory.`,
      ``,
      `## Guidelines`,
      ``,
      `- Follow the project conventions in this directory`,
      `- See AGENTS.md for agent-specific task instructions`,
      ``,
    ].join("\n");
  }
}
