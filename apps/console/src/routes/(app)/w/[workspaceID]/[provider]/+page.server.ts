import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";
import { hasProvider } from "@agents/core/git";
import type { ProviderType } from "@agents/core/git";
import { withActor } from "$lib/auth";

export const load: PageServerLoad = async (event) => {
  const { provider, workspaceID } = event.params;
  if (!hasProvider(provider as ProviderType)) error(400, `Unsupported provider: ${provider}`);

  return withActor(event, workspaceID, async () => {
    const all = await Repository.list();
    const repos = all.filter((repo) => repo.source === provider);
    const byOrg = new Map<string, typeof repos>();

    for (const repo of repos) {
      const list = byOrg.get(repo.owner) ?? [];
      list.push(repo);
      byOrg.set(repo.owner, list);
    }

    return {
      workspaceID,
      provider,
      orgs: [...byOrg.entries()].map(([org, repos]) => ({ org, repos })),
    };
  });
};
