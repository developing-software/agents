import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { getProvider } from "@agents/core/git";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { repo, provider, organization, repoName } = await parent();
  if (!repo) error(404, "Repository not found");

  const path = params.path ?? "";
  const ref = params.ref;

  const entries = await getProvider(repo.source).content.listDir(
    repo.fullName,
    path,
    ref,
  );
  if (!entries) error(404, "Path not found");

  const sorted = [...entries].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "dir" ? -1 : 1;
  });

  const segments = path ? path.split("/") : [];
  const breadcrumbs = segments.map((segment, i) => ({
    label: segment,
    href: `/${provider}/${organization}/${repoName}/tree/${ref}/${segments.slice(0, i + 1).join("/")}`,
  }));

  return {
    entries: sorted,
    path,
    ref,
    breadcrumbs,
  };
};
