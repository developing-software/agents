import type { LayoutServerLoad } from "./$types";
import { listAccessibleRepos } from "$lib/repository.server";

export const load: LayoutServerLoad = async (event) => {
  const { locals } = event;
  if (locals.actor.type === "public") return { accountID: null, sidebarOrgs: [] };

  try {
    const repos = await listAccessibleRepos(event);
    const byOrg = new Map<string, typeof repos>();
    for (const repo of repos) {
      const key = `${repo.workspaceID}:${repo.source}:${repo.owner}`;
      const list = byOrg.get(key) ?? [];
      list.push(repo);
      byOrg.set(key, list);
    }
    return {
      accountID: locals.actor.properties.accountID,
      sidebarOrgs: [...byOrg.entries()].map(([, repos]) => ({
        workspaceID: repos[0]!.workspaceID,
        source: repos[0]!.source,
        org: repos[0]!.owner,
        repos,
      })),
    };
  } catch {
    return { accountID: locals.actor.properties.accountID, sidebarOrgs: [] };
  }
};
