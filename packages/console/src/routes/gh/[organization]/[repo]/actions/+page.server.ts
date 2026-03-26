import type { PageServerLoad } from "./$types";
import { GitHub } from "@agents/core/github/client";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo, organization, repoName } = await parent();
  const defaultBranch = repo?.defaultBranch ?? "main";

  if (!repo) return { defaultBranch, workflows: [] };

  try {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner: organization,
      repo: repoName,
      per_page: 50,
    });
    return {
      defaultBranch,
      workflows: data.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        path: w.path,
        state: w.state,
      })),
    };
  } catch {
    return { defaultBranch, workflows: [] };
  }
};
