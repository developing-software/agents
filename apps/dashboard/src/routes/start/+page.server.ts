import { redirect } from "@sveltejs/kit";
import { Workspace } from "@agents/core/workspace";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const data = await event.parent();
  if (!data.user) redirect(303, "/login");
  // `gone` names a pick that stopped opening; without it, being inside one means the app is next.
  const gone = event.url.searchParams.get("gone");
  if (Workspace.provided() && !gone) redirect(303, "/home");
  return { email: data.user.email, gone };
};
