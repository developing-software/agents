import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository/index";

export const load: LayoutServerLoad = async ({ params, locals }) => {
  if (!locals.userID) throw redirect(302, "/");
  const { organization, repo } = params;
  const repoData = await Repository.findByFullName(`${organization}/${repo}`);
  return {
    repo: repoData,
    organization,
    repoName: repo,
    breadcrumbs: [
      { label: organization, href: `/gh/${organization}` },
      { label: repo, href: `/gh/${organization}/${repo}` },
    ],
  };
};
