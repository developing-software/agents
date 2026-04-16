import type { LayoutServerLoad } from "./$types";
import { redirect, error } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";
import { hasProvider } from "@agents/core/git";
import type { ProviderType } from "@agents/core/git";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  if (locals.actor.type !== "account") throw redirect(302, "/login");

  const { provider, org, repo } = params;
  if (!hasProvider(provider as ProviderType)) error(400, `Unsupported provider: ${provider}`);

  const repoData = await Repository.findByFullName(`${org}/${repo}`);
  if (repoData && repoData.source !== provider) {
    error(404, `Repository ${org}/${repo} does not belong to ${provider}`);
  }

  return {
    provider: provider as ProviderType,
    repo: repoData,
    organization: org,
    repoName: repo,
  };
};
