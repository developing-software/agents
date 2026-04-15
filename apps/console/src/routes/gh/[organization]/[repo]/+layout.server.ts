import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  if (locals.actor.type !== "account") throw redirect(302, "/login");
  const { organization, repo } = params;
  const repoData = await Repository.findByFullName(`${organization}/${repo}`);
  return { repo: repoData, organization, repoName: repo };
};
