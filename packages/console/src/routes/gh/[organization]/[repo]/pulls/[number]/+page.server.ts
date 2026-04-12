import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const { organization, repo, number } = params;
  const base = `/gh/${organization}/${repo}`;
  return {
    number: parseInt(number),
    breadcrumbs: [
      { label: `${organization}/${repo}`, href: base },
      { label: "Pull Requests", href: `${base}/pulls` },
      { label: `#${number}` },
    ],
  };
};
