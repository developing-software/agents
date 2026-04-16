import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Auth } from "@agents/core/auth";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.actor.type === "public") redirect(302, "/login");
  const providers = await Auth.listByAccount(locals.actor.properties.accountID);
  return { providers };
};
