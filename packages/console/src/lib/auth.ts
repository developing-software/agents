import { createClient } from "@openauthjs/openauth/client";
import type { RequestEvent } from "@sveltejs/kit";
import { subjects } from "@agents/functions/src/auth/subject";

export const authClient = createClient({
  clientID: "console",
  issuer: process.env.AUTH_URL ?? "https://auth.agents.developing.company",
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 34560000,
} as const;

export function getTokens(event: RequestEvent) {
  return {
    access: event.cookies.get("access_token"),
    refresh: event.cookies.get("refresh_token"),
  };
}

export function setTokens(event: RequestEvent, access: string, refresh: string) {
  event.cookies.set("access_token", access, COOKIE_OPTS);
  event.cookies.set("refresh_token", refresh, COOKIE_OPTS);
}

export function deleteTokens(event: RequestEvent) {
  event.cookies.delete("access_token", { path: "/" });
  event.cookies.delete("refresh_token", { path: "/" });
}

export async function verifyUser(event: RequestEvent) {
  const { access, refresh } = getTokens(event);
  if (!access || !refresh) {
    return null;
  }
  const verified = await authClient.verify(subjects, access, {
    refresh: refresh ?? undefined,
  });
  if (!verified.err) {
    if (verified.tokens) {
      setTokens(event, verified.tokens.access, verified.tokens.refresh);
    }
    if (verified.subject.type === "user") {
      return verified.subject.properties;
    }
  }
  return null;
}
