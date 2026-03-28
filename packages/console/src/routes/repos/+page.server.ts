import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ parent, locals }) => {
  if (!locals.userID) throw redirect(302, "/");
  const { sidebarOrgs } = await parent();
  return { orgs: sidebarOrgs };
};
