import { command } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository";
import { getProvider, isReservedBranch } from "@agents/core/git";
import { error } from "@sveltejs/kit";

const repoInput = z.object({
  organization: z.string(),
  repoName: z.string(),
});

export const deleteBranch = command(
  repoInput.extend({ branch: z.string().min(1) }),
  async ({ organization, repoName, branch }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);
    if (isReservedBranch(branch) || branch === repo.defaultBranch) {
      error(400, `Branch "${branch}" is protected`);
    }
    await getProvider(repo.source).branches.delete(repo.fullName, branch);
    return { ok: true, branch };
  },
);

export const deleteBranches = command(
  repoInput.extend({ branches: z.array(z.string().min(1)).min(1).max(50) }),
  async ({ organization, repoName, branches }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);
    const provider = getProvider(repo.source);
    const safe = branches.filter((b) => !isReservedBranch(b) && b !== repo.defaultBranch);
    const blocked = branches
      .filter((b) => !safe.includes(b))
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
  },
);
