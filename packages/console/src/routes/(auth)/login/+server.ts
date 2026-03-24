import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { authClient, getTokens, setTokens } from "$lib/auth";
import { subjects } from "@agents/functions/src/auth/subject";

export const GET: RequestHandler = async (event) => {
  const { access, refresh } = getTokens(event);

  if (access) {
    const verified = await authClient.verify(subjects, access, {
      refresh: refresh ?? undefined,
    });
    if (!verified.err) {
      if (verified.tokens) setTokens(event, verified.tokens.access, verified.tokens.refresh);
      redirect(302, "/");
    }
  }

  const redirectUri = `${event.url.origin}/callback`;
  const { url: authUrl } = await authClient.authorize(redirectUri, "code");
  redirect(302, authUrl);
};
