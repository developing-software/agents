import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ parent, locals }) => {
  if (locals.actor.type !== "account") throw redirect(302, "/login");
  const { sidebarOrgs } = await parent();
  return { orgs: sidebarOrgs };
};
