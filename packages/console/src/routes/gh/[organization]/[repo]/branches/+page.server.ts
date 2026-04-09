import type { PageServerLoad } from "./$types";
import { GithubBranch } from "@agents/core/github/repo/branch";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { branches: [], defaultBranch: "main" };

  const [branches, pulls] = await Promise.all([
    GithubBranch.listDetailed(repo),
    GithubPullRequest.list(repo),
  ]);

  // headBranch -> PRs. Pick a "primary" PR per branch:
  // prefer merged > open > most recent.
  const prByBranch = new Map<string, typeof pulls>();
  for (const pr of pulls) {
    const arr = prByBranch.get(pr.headBranch) ?? [];
    arr.push(pr);
    prByBranch.set(pr.headBranch, arr);
  }

  const enriched = branches.map((b) => {
    const branchPRs = prByBranch.get(b.name) ?? [];
    const primary =
      branchPRs.find((p) => p.state === "merged") ??
      branchPRs.find((p) => p.state === "open") ??
      branchPRs[0] ??
      null;
    return {
      ...b,
      pullRequest: primary,
      pullRequestCount: branchPRs.length,
      hasMergedPR: branchPRs.some((p) => p.state === "merged"),
    };
  });

  return { branches: enriched, defaultBranch: repo.defaultBranch ?? "main" };
};
