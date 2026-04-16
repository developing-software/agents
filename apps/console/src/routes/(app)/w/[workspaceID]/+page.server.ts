import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository";
import { withActor } from "$lib/auth";

export const load: PageServerLoad = async (event) => {
  const { workspaceID } = event.params;

  return withActor(event, workspaceID, async () => {
    const repos = await Repository.list();
    if (repos.length > 0) {
      throw redirect(302, `/w/${workspaceID}/${repos[0]!.source}`);
    }
    throw redirect(302, `/w/${workspaceID}/settings/integrations`);
  });
};
