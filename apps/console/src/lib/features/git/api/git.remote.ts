import { z } from "zod";
import { getProvider } from "@agents/core/git";
import { repoQuery } from "$lib/remote";

export const listIssues = repoQuery({}, async ({ repo }) =>
  getProvider(repo.source).issues.list(repo.fullName),
);

export const listPullRequests = repoQuery({}, async ({ repo }) =>
  getProvider(repo.source).pulls.list(repo.fullName),
);

export const getPRDiff = repoQuery({ prNumber: z.number() }, async ({ repo, prNumber }) => {
  let diff = await getProvider(repo.source).pulls.getDiff(repo.fullName, prNumber);
  const MAX_CHARS = 200_000;
  const truncated = diff.length > MAX_CHARS;
  if (truncated) diff = diff.slice(0, MAX_CHARS);
  return { diff, truncated };
});
