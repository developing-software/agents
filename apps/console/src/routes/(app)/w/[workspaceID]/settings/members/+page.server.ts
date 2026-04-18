import type { PageServerLoad } from "./$types";
import { Actor } from "@agents/core/actor";
import { User } from "@agents/core/user";
import { Workspace } from "@agents/core/workspace";
import { withActor } from "$lib/server/auth";

export const load: PageServerLoad = async (event) => {
  const { workspaceID } = event.params;
  return withActor(event, workspaceID, async () => {
    const actor = Actor.assert("user");
    const [workspace, members] = await Promise.all([
      Workspace.fromID(workspaceID),
      User.listForWorkspace(workspaceID),
    ]);

    return {
      workspaceID,
      workspace,
      members,
      role: actor.properties.role,
      userID: actor.properties.userID,
    };
  });
};
