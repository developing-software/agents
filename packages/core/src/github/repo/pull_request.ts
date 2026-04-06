import { GitHub } from "../client";
import { z } from "zod";

export namespace GithubPullRequest {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export const Info = z.object({
    number: z.number(),
    title: z.string(),
    state: z.string(),
    headBranch: z.string(),
    baseBranch: z.string(),
    htmlUrl: z.string(),
  });
  export type Info = z.infer<typeof Info>;

  export async function list(repo: RepoRef): Promise<Info[]> {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.pulls.list({
      owner: repo.owner,
      repo: repo.repo,
      state: "all",
      per_page: 100,
    });
    return data.map(serialize);
  }

  export async function get(repo: RepoRef, pullNumber: number): Promise<Info> {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: pullNumber,
    });
    return serialize(data);
  }

  export async function getDiff(repo: RepoRef, pullNumber: number): Promise<string> {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    });
    return data as unknown as string;
  }

  export async function merge(
    repo: RepoRef,
    pullNumber: number,
    opts?: { method?: "squash" | "merge" | "rebase" },
  ): Promise<{ merged: boolean; message: string }> {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.pulls.merge({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: pullNumber,
      merge_method: opts?.method ?? "squash",
    });
    return { merged: data.merged, message: data.message };
  }

  export async function close(repo: RepoRef, pullNumber: number): Promise<void> {
    const octokit = await GitHub.appClient(repo.installationId);
    await octokit.rest.pulls.update({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: pullNumber,
      state: "closed",
    });
  }

  function serialize(pr: {
    number: number;
    title: string;
    state: string;
    merged_at?: string | null;
    head: { ref: string };
    base: { ref: string };
    html_url: string;
  }): Info {
    return {
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? "merged" : pr.state,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      htmlUrl: pr.html_url,
    };
  }
}
