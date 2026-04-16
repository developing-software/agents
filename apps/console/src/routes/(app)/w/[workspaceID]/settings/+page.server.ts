import type { PageServerLoad } from "./$types";
import { Actor } from "@agents/core/actor";
import { Installation } from "@agents/core/git/installation";
import { User } from "@agents/core/user";
import { Workspace } from "@agents/core/workspace";
import { withActor } from "$lib/auth";

export const load: PageServerLoad = async (event) => {
  const { workspaceID } = event.params;
  return withActor(event, workspaceID, async () => {
    const actor = Actor.assert("user");
    const [workspace, members, installations] = await Promise.all([
      Workspace.fromID(workspaceID),
      User.listForWorkspace(workspaceID),
      Installation.listForWorkspace(),
    ]);

    return {
      workspaceID,
      workspace,
      role: actor.properties.role,
      memberCount: members.length,
      pendingInviteCount: members.filter((member) => !member.accountID).length,
      adminCount: members.filter((member) => member.role === "admin").length,
      installationCount: installations.length,
      inactiveInstallationCount: installations.filter((installation) => !installation.active)
        .length,
    };
  });
};
