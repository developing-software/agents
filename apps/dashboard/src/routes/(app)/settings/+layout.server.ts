import { Identity } from "@agents/core/identity";
import type { LayoutServerLoad } from "./$types";

// Which groups the rail lists; the `(workspace)`, `(admin)` and `(superadmin)` layouts are what refuse.
export const load: LayoutServerLoad = () => ({
  apps: Identity.can({ app: ["read"] }),
  admin: Identity.can({ admin: ["read"] }),
  superadmin: Identity.superadmin(),
});
