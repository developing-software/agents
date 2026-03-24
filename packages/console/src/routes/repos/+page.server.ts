import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { GithubRepo } from "@agents/core/github/repo/index";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.userID) redirect(302, "/");

  const repos = await GithubRepo.list().catch(() => []);

  const byOrg = new Map<string, typeof repos>();
  for (const repo of repos) {
    const list = byOrg.get(repo.owner) ?? [];
    list.push(repo);
    byOrg.set(repo.owner, list);
  }

  return {
    orgs: [...byOrg.entries()].map(([org, repos]) => ({ org, repos })),
  };
};
