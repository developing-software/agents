import { query } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";

const repoInput = z.object({
  organization: z.string(),
  repoName: z.string(),
});

export const listIssues = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return GithubIssue.list(repo);
});

export const listPullRequests = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return GithubPullRequest.list(repo);
});
