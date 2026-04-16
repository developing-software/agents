import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { error, redirect } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { Installation } from "@agents/core/git/installation";
import { Workspace } from "@agents/core/workspace";
import { withActor } from "$lib/auth";
import { requireSessionAccount } from "$lib/workspace.server";
import type { RequestEvent } from "@sveltejs/kit";

function integrationsPath(workspaceID: string, params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return `/w/${workspaceID}/settings/integrations${search ? `?${search}` : ""}`;
}

async function findInstallation(installationRef: string) {
  return Actor.provide("public", {}, () =>
    Installation.findByInstallationRef("github", installationRef),
  );
}

async function claim(event: RequestEvent, workspaceID: string, installationRef: string) {
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

export const claimInstallation = command(
  z.object({
    workspaceID: z.string(),
    installationRef: z.string().min(1),
  }),
  async ({ workspaceID, installationRef }) => {
    const event = getRequestEvent();
    const result = await claim(event, workspaceID, installationRef);
    if (result.type === "not_ready") {
      error(409, "Installation not ready yet. Refresh and try again.");
    }
    if (result.type === "already_linked") {
      error(409, `${result.org} is already linked to another workspace.`);
    }
    redirect(303, integrationsPath(workspaceID, { linked: result.org }));
  },
);

export const createWorkspaceAndClaim = command(
  z.object({
    name: z.string().trim().min(1, "Workspace name is required."),
    installationRef: z.string().min(1),
  }),
  async ({ name, installationRef }) => {
    const event = getRequestEvent();
    const existing = await findInstallation(installationRef);
    if (!existing) error(409, "Installation not ready yet. Refresh and try again.");

    const { accountID, email } = await requireSessionAccount(event);
    const workspaceID = await Actor.provide("account", { accountID, email }, () =>
      Workspace.create({ name }),
    );

    const result = await claim(event, workspaceID, installationRef);
    if (result.type === "already_linked") {
      redirect(303, integrationsPath(workspaceID, { error: "already_linked", org: result.org }));
    }
    if (result.type === "not_ready") {
      redirect(303, integrationsPath(workspaceID, { error: "installation_not_ready" }));
    }
    redirect(303, integrationsPath(workspaceID, { linked: result.org }));
  },
);
