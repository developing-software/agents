import { command } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository";
import { GithubBranch } from "@agents/core/github/repo/branch";
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
    // Defense in depth: re-check protected status server-side.
    if (GithubBranch.isReserved(branch) || branch === repo.defaultBranch) {
      error(400, `Branch "${branch}" is protected`);
    }
    await GithubBranch.remove(repo, branch);
    return { ok: true, branch };
  },
);

export const deleteBranches = command(
  repoInput.extend({ branches: z.array(z.string().min(1)).min(1).max(50) }),
  async ({ organization, repoName, branches }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);
    // Filter out anything protected before calling core, so partial
    // success is clearer to the caller.
    const safe = branches.filter((b) => !GithubBranch.isReserved(b) && b !== repo.defaultBranch);
    const blocked = branches
      .filter((b) => !safe.includes(b))
      .map((name) => ({ name, ok: false, error: "protected" }));
    const results = await GithubBranch.removeMany(repo, safe);
    return { results: [...blocked, ...results] };
  },
);
