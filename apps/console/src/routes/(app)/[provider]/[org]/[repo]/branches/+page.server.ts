import type { PageServerLoad } from "./$types";
import { getProvider, isReservedBranch } from "@agents/core/git";
import { AgentWorkflow } from "@agents/core/agent";

const AGENT_SET: ReadonlySet<string> = new Set(AgentWorkflow.Agents);

function detectAgent(branchName: string): string | null {
  const prefix = branchName.split("/")[0];
  return AGENT_SET.has(prefix) ? prefix : null;
}

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { branches: [], defaultBranch: "main" };

  const provider = getProvider(repo.source);
  const [branches, pulls] = await Promise.all([
    provider.branches.list(repo.fullName),
    provider.pulls.list(repo.fullName),
  ]);

  const prByBranch = new Map<string, typeof pulls>();
  for (const pr of pulls) {
    const arr = prByBranch.get(pr.headBranch) ?? [];
    arr.push(pr);
    prByBranch.set(pr.headBranch, arr);
  }

  const defaultBranch = repo.defaultBranch ?? "main";

  const enriched = branches.map((b) => {
    const branchPRs = prByBranch.get(b.name) ?? [];
    const primary =
      branchPRs.find((p) => p.state === "merged") ??
      branchPRs.find((p) => p.state === "open") ??
      branchPRs[0] ??
      null;
    return {
      name: b.name,
      sha: b.sha,
      protected: b.protected,
      reserved: isReservedBranch(b.name),
      isDefault: b.name === defaultBranch,
      agent: detectAgent(b.name),
      lastCommitDate: null,
      lastCommitAuthor: null,
      lastCommitMessage: null,
      aheadBy: null,
      behindBy: null,
      compareBase: null,
      pullRequest: primary,
      pullRequestCount: branchPRs.length,
      hasMergedPR: branchPRs.some((p) => p.state === "merged"),
    };
  });

  return { branches: enriched, defaultBranch };
};
