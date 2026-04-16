import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
  const installationId = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");

  return {
    accountID: locals.actor.type === "account" ? locals.actor.properties.accountID : null,
    installation:
      installationId && (setupAction === "install" || setupAction === "update")
        ? { installationId, action: setupAction }
        : null,
  };
};
