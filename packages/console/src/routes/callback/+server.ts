import type { RequestHandler } from "@sveltejs/kit";
import { redirect, error } from "@sveltejs/kit";
import { authClient, setTokens } from "$lib/auth";

export const GET: RequestHandler = async (event) => {
  const code = event.url.searchParams.get("code");
  const err = event.url.searchParams.get("error");

  if (err) error(400, event.url.searchParams.get("error_description") ?? err);
  if (!code) error(400, "Missing code");

  const exchanged = await authClient.exchange(code, `${event.url.origin}/callback`);
  if (exchanged.err) error(400, String(exchanged.err));

  setTokens(event, exchanged.tokens.access, exchanged.tokens.refresh);
  redirect(302, "/");
};
