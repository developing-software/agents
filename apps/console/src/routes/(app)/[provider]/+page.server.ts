import type { PageServerLoad } from "./$types";
import { redirect, error } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";
import { hasProvider } from "@agents/core/git";
import type { ProviderType } from "@agents/core/git";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (locals.actor.type !== "account") throw redirect(302, "/login");
  if (!hasProvider(params.provider as ProviderType))
    error(400, `Unsupported provider: ${params.provider}`);

  const all = await Repository.list();
  const repos = all.filter((r) => r.source === params.provider);

  const byOrg = new Map<string, typeof repos>();
  for (const repo of repos) {
    const list = byOrg.get(repo.owner) ?? [];
    list.push(repo);
    byOrg.set(repo.owner, list);
  }

  return {
    provider: params.provider,
    orgs: [...byOrg.entries()].map(([org, repos]) => ({ org, repos })),
  };
};
