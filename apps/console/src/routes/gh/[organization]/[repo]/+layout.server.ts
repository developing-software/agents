import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  if (!locals.userID) throw redirect(302, "/");
  const { organization, repo } = params;
  const repoData = await Repository.findByFullName(`${organization}/${repo}`);
  return { repo: repoData, organization, repoName: repo };
};
