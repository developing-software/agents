import type { PageServerLoad } from "./$types";
import { Workspace } from "@agents/core/workspace";
import { listSessionWorkspaces, requireSessionAccount } from "$lib/server/workspace.server";

export const load: PageServerLoad = async (event) => {
  const { accountID } = await requireSessionAccount(event);
  const [workspaces, lastSeenWorkspaceID] = await Promise.all([
    listSessionWorkspaces(accountID),
    Workspace.lastSeenID(accountID),
  ]);

  return {
    workspaces,
    lastSeenWorkspaceID,
  };
};
