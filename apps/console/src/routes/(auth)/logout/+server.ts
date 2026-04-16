import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { dropCurrentAccount } from "$lib/session";

export const GET: RequestHandler = async (event) => {
  const session = await dropCurrentAccount(event);
  if (Object.keys(session.accounts).length === 0) redirect(302, "/login");
  redirect(302, "/auth");
};
