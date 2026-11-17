import { redirect } from "@sveltejs/kit";
import { Workspace } from "@agents/core/workspace";
import * as next from "#lib/server/next.ts";
import type { LayoutServerLoad } from "./$types";

// Reads the URL only on the way out, so it never reruns on a navigation.
export const load: LayoutServerLoad = async (event) => {
  next.gate(event, (await event.parent()).user);
  // Everything in the app runs inside a workspace; someone in none creates or joins one first.
  if (!Workspace.provided()) redirect(303, "/start");
};
