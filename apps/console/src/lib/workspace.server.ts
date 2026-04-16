import type { RequestEvent } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { Workspace } from "@agents/core/workspace";
import { readSession } from "$lib/session";

export type SessionWorkspace = Awaited<ReturnType<typeof Workspace.forAccount>>[number];

export async function requireSessionAccount(event: RequestEvent) {
  const session = await readSession(event);
  const accountIDs = Object.keys(session.accounts);
  const accountID = session.current ?? accountIDs[0];
  const email = accountID ? session.accounts[accountID]?.email : undefined;
  if (!accountID || !email || accountIDs.length === 0) {
    throw redirect(302, "/login");
  }
  return { session, accountID, email };
}

export async function listSessionWorkspaces(accountID: string): Promise<SessionWorkspace[]> {
  return Workspace.forAccount(accountID);
}
