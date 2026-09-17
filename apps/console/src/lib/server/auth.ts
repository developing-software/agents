import { createClient } from "@openauthjs/openauth/client";
import { redirect, type RequestEvent } from "@sveltejs/kit";
import { Actor } from "@agents/core/actor";
import { User } from "@agents/core/user";
import { Workspace } from "@agents/core/workspace";
import { readSession } from "./session";

export const authClient = createClient({
  clientID: "console",
  issuer: process.env.AUTH_URL ?? "https://auth.agents.developing.company",
});

export async function withActor<T>(
  event: RequestEvent,
  workspaceID: string,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = event.locals.workspaceActors.get(workspaceID);
  if (cached) return Actor.provide(cached.type, cached.properties, fn);

  const session = await readSession(event);
  const accountIDs = Object.keys(session.accounts);
  if (accountIDs.length === 0) redirect(302, "/login");

  const member = await Actor.provide("public", {}, () =>
    Workspace.findMember({ accountIDs, workspaceID }),
  );
  if (!member) redirect(302, "/login");

  const actor: Actor.User = {
    type: "user",
    properties: {
      accountID: member.accountID!,
      workspaceID,
      userID: member.userID,
      role: member.role,
    },
  };
  event.locals.workspaceActors.set(workspaceID, actor);
  await Actor.provide(actor.type, actor.properties, () => User.touchSeen(member.userID));
  return Actor.provide(actor.type, actor.properties, fn);
}
