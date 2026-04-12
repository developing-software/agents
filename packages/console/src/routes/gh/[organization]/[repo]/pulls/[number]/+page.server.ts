import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { organization, repoName } = await parent();
  const number = parseInt(params.number);
  return {
    number,
    breadcrumbs: [
      { label: "Home", href: "/" },
      { label: `${organization}/${repoName}`, href: `/gh/${organization}/${repoName}` },
      { label: "Pull Requests", href: `/gh/${organization}/${repoName}/pulls` },
      { label: `#${number}` },
    ],
  };
};
