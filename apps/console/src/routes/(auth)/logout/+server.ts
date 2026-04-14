import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { deleteTokens } from "$lib/auth";

export const GET: RequestHandler = (event) => {
  deleteTokens(event);
  redirect(302, "/");
};
