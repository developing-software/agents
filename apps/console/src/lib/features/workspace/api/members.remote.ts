import { form, getRequestEvent } from "$app/server";
import { z } from "zod";
import { error, invalid } from "@sveltejs/kit";
import { User } from "@agents/core/user";
import { withActor } from "$lib/server/auth";

export const inviteMember = form(
  z.object({
    email: z.string().trim().email("A valid email is required."),
    role: z.enum(["admin", "member"]),
  }),
  async ({ email, role }, issue) => {
    const event = getRequestEvent();
    const workspaceID = event.params.workspaceID;
    if (!workspaceID) error(400, "Missing workspace");

    try {
      await withActor(event, workspaceID, () => User.invite({ email, role }));
    } catch (err) {
      invalid(issue.email(err instanceof Error ? err.message : "Unable to invite member."));
    }

    return { invitedEmail: email };
  },
);

export const removeMember = form(
  z.object({
    userID: z.string().min(1, "Missing member ID."),
  }),
  async ({ userID }, issue) => {
    const event = getRequestEvent();
    const workspaceID = event.params.workspaceID;
    if (!workspaceID) error(400, "Missing workspace");

    try {
      await withActor(event, workspaceID, () => User.remove(userID));
    } catch (err) {
      invalid(issue.userID(err instanceof Error ? err.message : "Unable to remove member."));
    }
  },
);
