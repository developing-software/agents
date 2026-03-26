import { GitHub } from "../client";
import { z } from "zod";

export namespace GithubIssue {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }
  export const Info = z.object({
    number: z.number(),
    title: z.string(),
    state: z.string(),
    labels: z.array(z.string()),
    body: z.string().optional().nullable(),
    htmlUrl: z.string(),
  });
  export type Info = z.infer<typeof Info>;

  export async function list(repo: RepoRef) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.issues.listForRepo({
      owner: repo.owner,
      repo: repo.repo,
      state: "all",
      per_page: 100,
    });
    return data.filter((i) => !i.pull_request).map(serialize);
  }

  export async function get(repo: RepoRef, issueNumber: number) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.issues.get({
      owner: repo.owner,
      repo: repo.repo,
      issue_number: issueNumber,
    });
    return serialize(data);
  }

  function serialize(issue: {
    number: number;
    title: string;
    state: string;
    labels: (string | { name?: string })[];
    body?: string | null;
    html_url: string;
  }): Info {
    return {
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))),
      body: issue.body ?? "",
      htmlUrl: issue.html_url,
    };
  }
}
