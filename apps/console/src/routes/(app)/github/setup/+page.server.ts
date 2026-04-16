import type { PageServerLoad } from "./$types";
import { error, redirect } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { Installation } from "@agents/core/git/installation";
import { Workspace } from "@agents/core/workspace";
import { withActor } from "$lib/auth";
import { listSessionWorkspaces, requireSessionAccount } from "$lib/workspace.server";

function integrationsPath(workspaceID: string, params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return `/w/${workspaceID}/settings/integrations${search ? `?${search}` : ""}`;
}

async function findInstallation(installationRef: string) {
  return Actor.provide("public", {}, () =>
    Installation.findByInstallationRef("github", installationRef),
  );
}

async function canAccessWorkspace(accountIDs: string[], workspaceID: string) {
  return Actor.provide("public", {}, () => Workspace.findMember({ accountIDs, workspaceID }));
}

export const load: PageServerLoad = async (event) => {
  const installationRef = event.url.searchParams.get("installation_id");
  if (!installationRef) {
    throw error(400, "Missing installation_id query parameter.");
  }

  const { accountID } = await requireSessionAccount(event);
  const stateWorkspaceID = event.url.searchParams.get("state");
  const installation = await findInstallation(installationRef);
  const workspaces = await listSessionWorkspaces(accountID);

  if (stateWorkspaceID) {
    const member = await canAccessWorkspace([accountID], stateWorkspaceID);
    if (member) {
      const existing = await findInstallation(installationRef);
      if (existing) {
        if (existing.workspaceId && existing.workspaceId !== stateWorkspaceID) {
          throw redirect(
            303,
            integrationsPath(stateWorkspaceID, {
              error: "already_linked",
              org: existing.providerAccountLogin,
            }),
          );
        }
        await withActor(event, stateWorkspaceID, () =>
          Installation.claim({
            provider: "github",
            installationRef,
            workspaceId: stateWorkspaceID,
          }),
        );
        throw redirect(
          303,
          integrationsPath(stateWorkspaceID, {
            linked: existing.providerAccountLogin,
          }),
        );
      }
    }
  }

  return {
    installationRef,
    installation,
    workspaces,
    stateWorkspaceID,
    stateNeedsSelection: Boolean(stateWorkspaceID),
    suggestedWorkspaceName: installation?.providerAccountLogin ?? "New workspace",
  };
};
