import { GitHub } from "../client";
import { z } from "zod";

export namespace GithubContent {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export const DirEntry = z.object({
    type: z.enum(["file", "dir", "symlink", "submodule"]),
    name: z.string(),
    path: z.string(),
    sha: z.string(),
    size: z.number(),
  });
  export type DirEntry = z.infer<typeof DirEntry>;

  export const TreeEntry = z.object({
    path: z.string(),
    mode: z.string(),
    type: z.enum(["blob", "tree"]),
    sha: z.string(),
    size: z.number().optional(),
  });
  export type TreeEntry = z.infer<typeof TreeEntry>;

  /**
   * Read raw file content from a repo.
   * Returns null if the file does not exist.
   */
  export async function readFile(
    repo: RepoRef,
    path: string,
    ref?: string,
  ): Promise<string | null> {
    const octokit = await GitHub.appClient(repo.installationId);
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: repo.owner,
        repo: repo.repo,
        path,
        ref,
        mediaType: { format: "raw" },
      });
      return data as unknown as string;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /**
   * List directory contents.
   * Returns null if the path does not exist.
   */
  export async function listDir(
    repo: RepoRef,
    path: string,
    ref?: string,
  ): Promise<DirEntry[] | null> {
    const octokit = await GitHub.appClient(repo.installationId);
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: repo.owner,
        repo: repo.repo,
        path,
        ref,
      });
      if (!Array.isArray(data)) return null;
      return data.map((entry) => ({
        type: entry.type as DirEntry["type"],
        name: entry.name,
        path: entry.path,
        sha: entry.sha,
        size: entry.size,
      }));
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  /**
   * Get full repo tree (recursive).
   */
  export async function getTree(repo: RepoRef, ref?: string): Promise<TreeEntry[]> {
    const octokit = await GitHub.appClient(repo.installationId);
    const sha = ref ?? "HEAD";
    const { data } = await octokit.rest.git.getTree({
      owner: repo.owner,
      repo: repo.repo,
      tree_sha: sha,
      recursive: "1",
    });
    return data.tree
      .filter((entry): entry is typeof entry & { path: string } => !!entry.path)
      .map((entry) => ({
        path: entry.path,
        mode: entry.mode ?? "",
        type: entry.type as "blob" | "tree",
        sha: entry.sha ?? "",
        size: entry.size,
      }));
  }

  /**
   * Create or update a file via commit.
   * If `sha` is provided, updates the existing file; otherwise creates a new file.
   */
  export async function writeFile(
    repo: RepoRef,
    path: string,
    content: string,
    message: string,
    branch?: string,
    sha?: string,
  ): Promise<void> {
    const octokit = await GitHub.appClient(repo.installationId);
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: repo.owner,
      repo: repo.repo,
      path,
      message,
      content: Buffer.from(content).toString("base64"),
      branch,
      sha,
    });
  }

  export interface CommitFilesOptions {
    repo: RepoRef;
    files: Array<{ path: string; content: string }>;
    message: string;
    /** "direct" commits to the base branch; "pr" creates a new branch + PR. */
    mode: "direct" | "pr";
    /** Branch to commit to (direct) or base branch for the PR (pr). */
    base?: string;
  }

  export interface CommitResult {
    mode: "direct" | "pr";
    pr?: { number: number; url: string; branch: string };
  }

  /**
   * Write file(s) either directly to a branch or via a new branch + PR.
   * Reusable across audit editing, AGENTS.md, skills, etc.
   */
  export async function commitFiles(opts: CommitFilesOptions): Promise<CommitResult> {
    if (opts.mode === "direct") {
      for (const file of opts.files) {
        await writeFile(opts.repo, file.path, file.content, opts.message, opts.base);
      }
      return { mode: "direct" };
    }

    const octokit = await GitHub.appClient(opts.repo.installationId);

    // Resolve the base branch
    const base = opts.base ?? "dev";
    const { data: baseRef } = await octokit.rest.git.getRef({
      owner: opts.repo.owner,
      repo: opts.repo.repo,
      ref: `heads/${base}`,
    });

    // Create a new branch
    const branchName = `console/edit-${Date.now()}`;
    await octokit.rest.git.createRef({
      owner: opts.repo.owner,
      repo: opts.repo.repo,
      ref: `refs/heads/${branchName}`,
      sha: baseRef.object.sha,
    });

    // Write files to the new branch
    for (const file of opts.files) {
      await writeFile(opts.repo, file.path, file.content, opts.message, branchName);
    }

    // Create PR
    const { data: pr } = await octokit.rest.pulls.create({
      owner: opts.repo.owner,
      repo: opts.repo.repo,
      title: opts.message,
      body: `Files changed:\n${opts.files.map((f) => `- \`${f.path}\``).join("\n")}`,
      head: branchName,
      base,
    });

    return {
      mode: "pr",
      pr: { number: pr.number, url: pr.html_url, branch: branchName },
    };
  }

  /**
   * Delete a file via commit.
   */
  export async function deleteFile(
    repo: RepoRef,
    path: string,
    message: string,
    sha: string,
    branch?: string,
  ): Promise<void> {
    const octokit = await GitHub.appClient(repo.installationId);
    await octokit.rest.repos.deleteFile({
      owner: repo.owner,
      repo: repo.repo,
      path,
      message,
      sha,
      branch,
    });
  }
}
