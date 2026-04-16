import type { PageServerLoad } from "./$types";
import { withActor } from "$lib/auth";
import { Repository } from "@agents/core/repository";

export const load: PageServerLoad = async (event) => {
  const { org, provider, workspaceID } = event.params;
  return withActor(event, workspaceID, async () => {
    const repos = await Repository.listByOwner(org);
    return { repos, provider, workspaceID, organization: org };
  });
};
