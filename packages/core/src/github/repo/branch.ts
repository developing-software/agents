import { GitHub } from "../client";
import { z } from "zod";

export namespace GithubBranch {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export const Info = z.object({
    name: z.string(),
    protected: z.boolean(),
  });
  export type Info = z.infer<typeof Info>;

  export async function list(repo: RepoRef): Promise<Info[]> {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.repos.listBranches({
      owner: repo.owner,
      repo: repo.repo,
      per_page: 100,
    });
    return data.map((b) => ({ name: b.name, protected: b.protected }));
  }
}
