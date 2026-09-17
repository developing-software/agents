import { form, getRequestEvent } from "$app/server";
import { z } from "zod";
import { redirect } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { Workspace } from "@agents/core/workspace";
import { requireSessionAccount } from "$lib/server/workspace.server";

export const createWorkspace = form(
  z.object({
    name: z.string().trim().min(1, "Workspace name is required."),
  }),
  async ({ name }) => {
    const event = getRequestEvent();
    const { accountID, email } = await requireSessionAccount(event);

    const workspaceID = await Actor.provide("account", { accountID, email }, () =>
      Workspace.create({ name }),
    );

    redirect(303, `/w/${workspaceID}`);
  },
);
