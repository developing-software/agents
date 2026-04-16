import type { Actions, PageServerLoad } from "./$types";
import { error, fail, redirect, type RequestEvent } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { Installation } from "@agents/core/git/installation";
import { Workspace } from "@agents/core/workspace";
import { withActor } from "$lib/auth";
import { listSessionWorkspaces, requireSessionAccount } from "$lib/workspace.server";

function integrationsRedirect(workspaceID: string, params: Record<string, string>) {
  const target = new URL(`https://console.local/w/${workspaceID}/settings/integrations`);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  return target.pathname + target.search;
}

async function findInstallation(installationRef: string) {
  return Actor.provide("public", {}, () =>
    Installation.findByInstallationRef("github", installationRef),
  );
}

async function canAccessWorkspace(accountIDs: string[], workspaceID: string) {
  return Actor.provide("public", {}, () => Workspace.findMember({ accountIDs, workspaceID }));
}

async function claimInstallation(
  event: RequestEvent,
  workspaceID: string,
  installationRef: string,
) {
  const existing = await findInstallation(installationRef);
  if (!existing) return { type: "not_ready" as const };
  if (existing.workspaceId && existing.workspaceId !== workspaceID) {
    return {
      type: "already_linked" as const,
      org: existing.providerAccountLogin,
    };
  }
  await withActor(event, workspaceID, () =>
    Installation.claim({
      provider: "github",
      installationRef,
      workspaceId: workspaceID,
    }),
  );
  return {
    type: "linked" as const,
    org: existing.providerAccountLogin,
  };
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
      const result = await claimInstallation(event, stateWorkspaceID, installationRef);
      if (result.type === "linked") {
        throw redirect(
          303,
          integrationsRedirect(stateWorkspaceID, {
            linked: result.org,
          }),
        );
      }
      if (result.type === "already_linked") {
        throw redirect(
          303,
          integrationsRedirect(stateWorkspaceID, {
            error: "already_linked",
            org: result.org,
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

export const actions: Actions = {
  claim: async (event) => {
    const installationRef = event.url.searchParams.get("installation_id");
    if (!installationRef) return fail(400, { message: "Missing installation id." });

    const form = await event.request.formData();
    const workspaceID = form.get("workspaceID");
    if (typeof workspaceID !== "string" || !workspaceID) {
      return fail(400, { message: "Select a workspace." });
    }

    const result = await claimInstallation(event, workspaceID, installationRef);
    if (result.type === "not_ready") {
      return fail(409, { message: "Installation not ready yet. Refresh and try again." });
    }
    if (result.type === "already_linked") {
      return fail(409, { message: `${result.org} is already linked to another workspace.` });
    }

    throw redirect(
      303,
      integrationsRedirect(workspaceID, {
        linked: result.org,
      }),
    );
  },
  createWorkspace: async (event) => {
    const installationRef = event.url.searchParams.get("installation_id");
    if (!installationRef) return fail(400, { message: "Missing installation id." });

    const form = await event.request.formData();
    const name = form.get("name");
    if (typeof name !== "string" || !name.trim()) {
      return fail(400, { message: "Workspace name is required." });
    }

    const existing = await findInstallation(installationRef);
    if (!existing) {
      return fail(409, { message: "Installation not ready yet. Refresh and try again." });
    }

    const { accountID, email } = await requireSessionAccount(event);
    const workspaceID = await Actor.provide("account", { accountID, email }, () =>
      Workspace.create({ name: name.trim() }),
    );

    const result = await claimInstallation(event, workspaceID, installationRef);
    if (result.type === "already_linked") {
      throw redirect(
        303,
        integrationsRedirect(workspaceID, {
          error: "already_linked",
          org: result.org,
        }),
      );
    }
    if (result.type === "not_ready") {
      throw redirect(
        303,
        integrationsRedirect(workspaceID, {
          error: "installation_not_ready",
        }),
      );
    }

    throw redirect(
      303,
      integrationsRedirect(workspaceID, {
        linked: result.org,
      }),
    );
  },
};
