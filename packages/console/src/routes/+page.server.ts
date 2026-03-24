import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = ({ locals, url }) => {
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");

  return {
    userID: locals.userID ?? null,
    installation:
      installationId && (setupAction === "install" || setupAction === "update")
        ? { installationId, action: setupAction }
        : null,
  };
};
