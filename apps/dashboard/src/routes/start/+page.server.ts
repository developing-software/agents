import { redirect } from "@sveltejs/kit";
import { Workspace } from "@agents/core/workspace";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const data = await event.parent();
  if (!data.user) redirect(303, "/login");
  // Already inside one, or just entered it: the app is the way on.
  if (Workspace.provided()) redirect(303, "/home");
  return { email: data.user.email };
};
