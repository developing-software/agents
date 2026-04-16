import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { User } from "@agents/core/user";
import { Workspace } from "@agents/core/workspace";
import { withActor } from "$lib/auth";

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
    };
  });
};

export const actions: Actions = {
  invite: async (event) => {
    const { workspaceID } = event.params;
    const form = await event.request.formData();
    const email = form.get("email");
    const role = form.get("role");

    if (typeof email !== "string" || !email.trim()) {
      return fail(400, { message: "Email is required." });
    }
    if (role !== "admin" && role !== "member") {
      return fail(400, { message: "Role must be admin or member." });
    }

    try {
      await withActor(event, workspaceID, () => User.invite({ email: email.trim(), role }));
      return {
        success: true,
        invitedEmail: email.trim(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to invite member.";
      return fail(400, { message });
    }
  },
};
