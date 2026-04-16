import { command, query } from "$app/server";
import { z } from "zod";
import { error } from "@sveltejs/kit";
import {
  getProvider,
  isReservedBranch,
  type NormalizedPullRequest,
} from "@agents/core/git";
import { AgentWorkflow } from "@agents/core/agent";
import { withRequestRepoActor } from "$lib/repository.server";

const repoInput = z.object({
  organization: z.string(),
  repoName: z.string(),
});

// ── Wrapper type ───────────────────────────────────────────────────────────
// Branch details surfaced by `listBranchDetails` — joins a NormalizedBranch
// with derived flags and its primary PR. Exported so consumers (BranchList,
// page loaders) can import this exact shape without a re-export shim.
export interface BranchDetails {
  name: string;
  sha: string;
  protected: boolean;
  reserved: boolean;
  isDefault: boolean;
  agent: string | null;
  lastCommitDate: string | null;
  lastCommitAuthor: string | null;
  lastCommitMessage: string | null;
  aheadBy: number | null;
  behindBy: number | null;
  compareBase: string | null;
  pullRequest: NormalizedPullRequest | null;
  pullRequestCount: number;
  hasMergedPR: boolean;
}

const AGENT_SET: ReadonlySet<string> = new Set(AgentWorkflow.Agents);

function detectAgent(branchName: string): string | null {
  const prefix = branchName.split("/")[0];
  return AGENT_SET.has(prefix) ? prefix : null;
}

export const listBranchDetails = query(
  repoInput,
  async ({
    organization,
    repoName,
  }): Promise<{ branches: BranchDetails[]; defaultBranch: string }> => {
    return withRequestRepoActor({ organization, repoName }, async (repo) => {
      const provider = getProvider(repo.source);
      const [branches, pulls] = await Promise.all([
        provider.branches.list(repo.fullName),
        provider.pulls.list(repo.fullName),
      ]);

      const prByBranch = new Map<string, NormalizedPullRequest[]>();
      for (const pr of pulls) {
        const arr = prByBranch.get(pr.headBranch) ?? [];
        arr.push(pr);
        prByBranch.set(pr.headBranch, arr);
      }

      const defaultBranch = repo.defaultBranch ?? "main";

      const enriched: BranchDetails[] = branches.map((b) => {
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
    });
  },
);

export const deleteBranch = command(
  repoInput.extend({ branch: z.string().min(1) }),
  async ({ organization, repoName, branch }) => {
    return withRequestRepoActor({ organization, repoName }, async (repo) => {
      if (isReservedBranch(branch) || branch === repo.defaultBranch) {
        error(400, `Branch "${branch}" is protected`);
      }
      await getProvider(repo.source).branches.delete(repo.fullName, branch);
      return { ok: true, branch };
    });
  },
);

export const deleteBranches = command(
  repoInput.extend({ branches: z.array(z.string().min(1)).min(1).max(50) }),
  async ({ organization, repoName, branches }) => {
    return withRequestRepoActor({ organization, repoName }, async (repo) => {
      const provider = getProvider(repo.source);
      const safe = branches.filter(
        (branch) => !isReservedBranch(branch) && branch !== repo.defaultBranch,
      );
      const blocked = branches
        .filter((branch) => !safe.includes(branch))
        .map((name) => ({ name, ok: false as const, error: "protected" }));
      const results: Array<{ name: string; ok: boolean; error?: string }> = [];
      for (const name of safe) {
        try {
          await provider.branches.delete(repo.fullName, name);
          results.push({ name, ok: true });
        } catch (err) {
          results.push({
            name,
            ok: false,
            error: err instanceof Error ? err.message : "delete failed",
          });
        }
      }
      return { results: [...blocked, ...results] };
    });
  },
);
