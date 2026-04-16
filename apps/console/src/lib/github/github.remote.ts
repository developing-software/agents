import { query } from "$app/server";
import { z } from "zod";
import { getProvider } from "@agents/core/git";
import { Repository } from "@agents/core/repository";

const repoInput = z.object({
  organization: z.string(),
  repoName: z.string(),
});

export const listIssues = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return getProvider(repo.source).issues.list(repo.fullName);
});

export const listPullRequests = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return [];
  return getProvider(repo.source).pulls.list(repo.fullName);
});

const prDiffInput = repoInput.extend({ prNumber: z.number() });

export const getPRDiff = query(prDiffInput, async ({ organization, repoName, prNumber }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) return { diff: "", truncated: false };
  let diff = await getProvider(repo.source).pulls.getDiff(repo.fullName, prNumber);
  const MAX_CHARS = 200_000;
  const truncated = diff.length > MAX_CHARS;
  if (truncated) diff = diff.slice(0, MAX_CHARS);
  return { diff, truncated };
});
