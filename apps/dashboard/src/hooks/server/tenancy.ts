import type { Handle } from "@sveltejs/kit/hooks";
import { Auth } from "@agents/core/auth";

// Multi mode picks the workspace by `workspace` cookie or `x-workspace` slug. Runs after `auth`,
// whose identity it re-reads as the caller holds it in that workspace.
export const tenancy: Handle = ({ event, resolve }) =>
  Auth.enter(
    event.cookies.get("workspace") ?? event.request.headers.get("x-workspace") ?? undefined,
    () => resolve(event),
  );
