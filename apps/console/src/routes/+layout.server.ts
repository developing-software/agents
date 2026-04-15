import type { LayoutServerLoad } from "./$types";
import { Repository } from "@agents/core/repository";

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.actor.type !== "account") return { accountID: null, sidebarOrgs: [] };

  try {
    const repos = await Repository.list();
    const byOrg = new Map<string, typeof repos>();
    for (const repo of repos) {
      const list = byOrg.get(repo.owner) ?? [];
      list.push(repo);
      byOrg.set(repo.owner, list);
    }
    return {
      accountID: locals.actor.properties.accountID,
      sidebarOrgs: [...byOrg.entries()].map(([org, repos]) => ({ org, repos })),
    };
  } catch {
    return { accountID: locals.actor.properties.accountID, sidebarOrgs: [] };
  }
};
