import type { PageServerLoad } from "./$types";
import { error, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo, provider, organization, repoName } = await parent();
  if (!repo) error(404, "Repository not found");
  redirect(302, `/${provider}/${organization}/${repoName}/tree/${repo.defaultBranch}`);
};
