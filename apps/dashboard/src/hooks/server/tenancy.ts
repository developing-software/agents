import type { Handle } from "@sveltejs/kit/hooks";
import { Auth } from "@agents/core/auth";
import { Workspaces } from "@agents/core/workspaces";

// Multi mode picks the workspace by `workspace` cookie. Runs after `auth`, whose identity it
// re-reads as the caller holds it in that workspace.
export const tenancy: Handle = async ({ event, resolve }) => {
  const kept = event.cookies.get("workspace");
  // Lenient: a remembered pick that no longer opens comes back empty, so it is asked again.
  const target = await Workspaces.target(kept, false);
  if (kept && !target) {
    event.cookies.delete("workspace", { path: "/" });
    return new Response(null, {
      status: 303,
      headers: { location: `/start?gone=${encodeURIComponent(kept)}` },
    });
  }
  return Auth.enter(target, () => resolve(event));
};
