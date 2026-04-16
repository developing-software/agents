import type { PageServerLoad, Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { Auth } from "@agents/core/auth";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.actor.type !== "account") redirect(302, "/login");
  const providers = await Auth.listByAccount(locals.actor.properties.accountID);
  return { providers };
};

export const actions: Actions = {
  unlink: async ({ request, locals }) => {
    if (locals.actor.type !== "account") redirect(302, "/login");
    const form = await request.formData();
    const id = form.get("id");
    if (typeof id !== "string" || !id) return fail(400, { message: "missing id" });
    try {
      await Auth.remove({ id, accountID: locals.actor.properties.accountID });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "failed to unlink";
      return fail(400, { message });
    }
    return { ok: true };
  },
};
