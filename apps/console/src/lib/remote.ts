import { command, query } from "$app/server";
import { z } from "zod";
import type { Repository } from "@agents/core/repository";
import { withRequestRepoActor } from "$lib/server/repository.server";

export const repoInput = z.object({
  organization: z.string(),
  repoName: z.string(),
});

type RepoBaseInput = z.output<typeof repoInput>;
type RepoContext = {
  repo: Repository.Info;
  workspaceID: string;
};
type RepoInputWithExtra<Extra extends z.ZodRawShape> = z.output<
  z.ZodObject<typeof repoInput.shape & Extra>
>;

export function repoQuery<Extra extends z.ZodRawShape, Result>(
  extra: Extra,
  handler: (input: RepoInputWithExtra<Extra> & RepoContext) => Promise<Result> | Result,
) {
  const schema = repoInput.extend(extra);
  return query(schema, async (input) => {
    const baseInput = input as RepoBaseInput;
    const extendedInput = input as RepoInputWithExtra<Extra>;
    return withRequestRepoActor(
      { organization: baseInput.organization, repoName: baseInput.repoName },
      async (repo, workspaceID) => handler({ ...extendedInput, repo, workspaceID }),
    );
  });
}

export function repoCommand<Extra extends z.ZodRawShape, Result>(
  extra: Extra,
  handler: (input: RepoInputWithExtra<Extra> & RepoContext) => Promise<Result> | Result,
) {
  const schema = repoInput.extend(extra);
  return command(schema, async (input) => {
    const baseInput = input as RepoBaseInput;
    const extendedInput = input as RepoInputWithExtra<Extra>;
    return withRequestRepoActor(
      { organization: baseInput.organization, repoName: baseInput.repoName },
      async (repo, workspaceID) => handler({ ...extendedInput, repo, workspaceID }),
    );
  });
}
