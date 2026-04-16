import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { authClient } from "$lib/auth";

export const GET: RequestHandler = async (event) => {
  if (event.locals.actor.type === "account") redirect(302, "/auth");

  const callback = new URL("/callback", event.url.origin);
  const { url: authUrl } = await authClient.authorize(callback.toString(), "code");
  redirect(302, authUrl);
};
