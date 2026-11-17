import { error } from "@sveltejs/kit";
import { Identity } from "@agents/core/identity";
import type { LayoutServerLoad } from "./$types";

// Platform and deploy pages (the registry, the instance) answer to the account, not the workspace role.
export const load: LayoutServerLoad = () => {
  if (!Identity.superadmin()) error(403, "Superadmins only");
};
