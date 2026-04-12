import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const { organization, repo, number } = params;
  return {
    number: parseInt(number),
    breadcrumbs: [
      { label: `${organization}/${repo}`, href: `/gh/${organization}/${repo}` },
      { label: 'Issues', href: `/gh/${organization}/${repo}/issues` },
      { label: `#${number}` },
    ],
  };
};
