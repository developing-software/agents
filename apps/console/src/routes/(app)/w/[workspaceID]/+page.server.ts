import type { PageServerLoad } from "./$types";
import { Workspace } from "@agents/core/workspace";
import { Repository } from "@agents/core/repository";
import { withActor } from "$lib/server/auth";

export const load: PageServerLoad = async (event) => {
  const { workspaceID } = event.params;

  return withActor(event, workspaceID, async () => {
    const [workspace, repos] = await Promise.all([
      Workspace.fromID(workspaceID),
      Repository.list(),
    ]);

    const providerCounts = new Map<string, { repoCount: number; orgs: Set<string> }>();
    for (const repo of repos) {
      const current = providerCounts.get(repo.source) ?? { repoCount: 0, orgs: new Set<string>() };
      current.repoCount += 1;
      current.orgs.add(repo.owner);
      providerCounts.set(repo.source, current);
    }

    return {
      workspaceID,
      workspace,
      providers: [...providerCounts.entries()].map(([provider, info]) => ({
        provider,
        repoCount: info.repoCount,
        orgCount: info.orgs.size,
      })),
      repoCount: repos.length,
    };
  });
};
