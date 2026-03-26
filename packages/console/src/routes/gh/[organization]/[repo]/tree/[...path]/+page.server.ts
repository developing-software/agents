import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { GitHub } from "@agents/core/github/client";

export const load: PageServerLoad = async ({ params, parent }) => {
  const { repo } = await parent();
  if (!repo) error(404, "Repository not found");

  const octokit = await GitHub.appClient(repo.installationId);

  const path = params.path ?? "";

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: params.organization,
      repo: params.repo,
      path,
    });

    const entries = Array.isArray(data) ? data : [data];
    const sorted = entries.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "dir" ? -1 : 1;
    });

    const segments = path ? path.split("/") : [];
    const breadcrumbs = segments.map((segment: string, i: number) => ({
      label: segment,
      href: `/gh/${params.organization}/${params.repo}/tree/${segments.slice(0, i + 1).join("/")}`,
    }));

    return {
      entries: sorted,
      path,
      breadcrumbs,
    };
  } catch (e: any) {
    if (e?.status === 404) error(404, "Path not found");
    throw e;
  }
};
