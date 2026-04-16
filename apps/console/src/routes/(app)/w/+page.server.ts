import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { Workspace } from "@agents/core/workspace";
import { listSessionWorkspaces, requireSessionAccount } from "$lib/workspace.server";

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

export const actions: Actions = {
  create: async (event) => {
    const { accountID, email } = await requireSessionAccount(event);
    const form = await event.request.formData();
    const name = form.get("name");
    if (typeof name !== "string" || !name.trim()) {
      return fail(400, { message: "Workspace name is required." });
    }

    const workspaceID = await Actor.provide("account", { accountID, email }, () =>
      Workspace.create({ name: name.trim() }),
    );

    throw redirect(303, `/w/${workspaceID}`);
  },
};
