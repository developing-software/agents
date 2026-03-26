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

  function serialize(pr: {
    number: number;
    title: string;
    state: string;
    merged_at?: string | null;
    head: { ref: string };
    base: { ref: string };
  }): Info {
    return {
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? "merged" : pr.state,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
    };
  }
}
