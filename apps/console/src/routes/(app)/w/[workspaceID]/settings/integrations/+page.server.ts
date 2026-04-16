import type { PageServerLoad } from "./$types";
import { Installation } from "@agents/core/git/installation";
import { withActor } from "$lib/auth";

export const load: PageServerLoad = async (event) => {
  const { workspaceID } = event.params;
  return withActor(event, workspaceID, async () => ({
    workspaceID,
    appSlug: process.env.GITHUB_APP_SLUG ?? "",
    installations: await Installation.listForWorkspace(),
    linked: event.url.searchParams.get("linked"),
    error: event.url.searchParams.get("error"),
    org: event.url.searchParams.get("org"),
  }));
};
