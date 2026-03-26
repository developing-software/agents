import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { GithubRepo } from "@agents/core/github/repo/index";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.userID) throw redirect(302, "/");

  try {
    const repos = await GithubRepo.list();

    const byOrg = new Map<string, typeof repos>();
    for (const repo of repos) {
      const list = byOrg.get(repo.owner) ?? [];
      list.push(repo);
      byOrg.set(repo.owner, list);
    }

    return {
      orgs: [...byOrg.entries()].map(([org, repos]) => ({ org, repos })),
    };
  } catch (error) {
    console.error(error);
    return {
      orgs: [],
    };
  }
};
