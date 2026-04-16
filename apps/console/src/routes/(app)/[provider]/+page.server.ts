import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Workspace } from "@agents/core/workspace";

export const load: PageServerLoad = async ({ params, locals }) => {
  if (locals.actor.type === "public") throw redirect(302, "/login");
  const workspaceID = await Workspace.lastSeenID(locals.actor.properties.accountID);
  if (!workspaceID) throw redirect(302, "/workspaces");
  throw redirect(302, `/w/${workspaceID}/${params.provider}`);
};
