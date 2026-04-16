import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.actor.type !== "account") redirect(302, "/login");
  return {};
};
