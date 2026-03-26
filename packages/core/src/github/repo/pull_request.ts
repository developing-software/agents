import { GitHub } from "../client";

export namespace GithubPullRequest {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export async function list(repo: RepoRef) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.pulls.list({
      owner: repo.owner,
      repo: repo.repo,
      state: "all",
      per_page: 100,
    });
    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.merged_at ? "merged" : pr.state,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
    }));
  }

  export async function get(repo: RepoRef, pullNumber: number) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: pullNumber,
    });
    return {
      number: data.number,
      title: data.title,
      state: data.merged_at ? "merged" : data.state,
      headBranch: data.head.ref,
      baseBranch: data.base.ref,
    };
  }
}
