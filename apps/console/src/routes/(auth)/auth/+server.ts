import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { Workspace } from "@agents/core/workspace";

export const GET: RequestHandler = async (event) => {
  if (event.locals.actor.type !== "account") redirect(302, "/login");
  const workspaceID = await Workspace.lastSeenID(event.locals.actor.properties.accountID);
  if (workspaceID) redirect(302, `/w/${workspaceID}`);
  redirect(302, "/workspaces");
};
