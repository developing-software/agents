import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { authClient } from "$lib/auth";

export const GET: RequestHandler = async (event) => {
  if (event.locals.actor.type === "account") redirect(302, "/auth");

  const redirectUri = `${event.url.origin}/callback`;
  const { url: authUrl } = await authClient.authorize(redirectUri, "code");
  redirect(302, authUrl);
};
