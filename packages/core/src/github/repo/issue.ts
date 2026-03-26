import { GitHub } from "../client";

export namespace GithubIssue {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export async function list(repo: RepoRef) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.issues.listForRepo({
      owner: repo.owner,
      repo: repo.repo,
      state: "all",
      per_page: 100,
    });
    return data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))),
        body: i.body ?? undefined,
      }));
  }

  export async function get(repo: RepoRef, issueNumber: number) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.issues.get({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issueNumber,
    });
    return {
      number: data.number,
      title: data.title,
      state: data.state,
      labels: data.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))),
      body: data.body ?? undefined,
    };
  }
}
