import type { LayoutServerLoad } from "./$types";
import { redirect, error } from "@sveltejs/kit";
import { hasProvider } from "@agents/core/git";
import type { ProviderType } from "@agents/core/git";
import { withRepoActor } from "$lib/repository.server";

export const load: LayoutServerLoad = async (event) => {
  const { params, locals } = event;
  if (locals.actor.type === "public") throw redirect(302, "/login");

  const { provider, org, repo } = params;
  if (!hasProvider(provider as ProviderType)) error(400, `Unsupported provider: ${provider}`);
  return withRepoActor(event, { provider, organization: org, repoName: repo }, async (repoData) => {
    if (repoData.source !== provider) {
      error(404, `Repository ${org}/${repo} does not belong to ${provider}`);
    }

    return {
      provider: provider as ProviderType,
      repo: repoData,
      organization: org,
      repoName: repo,
    };
  });
};
