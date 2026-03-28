import type { LayoutServerLoad } from "./$types";
import { Repository } from "@agents/core/repository/index";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.userID) return { userID: null, sidebarOrgs: [] };

  try {
    const repos = await Repository.list();
    const byOrg = new Map<string, typeof repos>();
    for (const repo of repos) {
      const list = byOrg.get(repo.owner) ?? [];
      list.push(repo);
      byOrg.set(repo.owner, list);
    }
    return {
      userID: locals.userID,
      sidebarOrgs: [...byOrg.entries()].map(([org, repos]) => ({ org, repos })),
    };
  } catch {
    return { userID: locals.userID, sidebarOrgs: [] };
  }
};
