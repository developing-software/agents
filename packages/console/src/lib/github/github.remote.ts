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

const prDiffInput = repoInput.extend({ prNumber: z.number() });

export const getPRDiff = query(prDiffInput, async ({ organization, repoName, prNumber }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return { diff: "", truncated: false };
  let diff = await GithubPullRequest.getDiff(repo, prNumber);
  const MAX_CHARS = 200_000;
  const truncated = diff.length > MAX_CHARS;
  if (truncated) diff = diff.slice(0, MAX_CHARS);
  return { diff, truncated };
});
