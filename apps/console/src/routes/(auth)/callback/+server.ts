import type { RequestHandler } from "@sveltejs/kit";
import { redirect, error } from "@sveltejs/kit";
import { authClient } from "$lib/auth";
import { addAccountToSession, readSession } from "$lib/session";
import { subjects } from "@agents/functions/src/auth/subject";
import { Auth } from "@agents/core/auth";
import { Actor } from "@agents/core/actor";
import { User } from "@agents/core/user";
import { Workspace } from "@agents/core/workspace";

export const GET: RequestHandler = async (event) => {
  const code = event.url.searchParams.get("code");
  const err = event.url.searchParams.get("error");
  const link = event.url.searchParams.get("link") === "1";

  if (err) error(400, event.url.searchParams.get("error_description") ?? err);
  if (!code) error(400, "Missing code");

  const callback = new URL("/callback", event.url.origin);
  if (link) callback.searchParams.set("link", "1");

  const exchanged = await authClient.exchange(code, callback.toString());
  if (exchanged.err) error(400, String(exchanged.err));

  const decoded = await authClient.verify(subjects, exchanged.tokens.access);
  if (decoded.err) error(400, String(decoded.err));
  if (decoded.subject.type !== "account") error(400, "unexpected subject");

  const { accountID, email } = decoded.subject.properties;

  if (link) {
    const session = await readSession(event);
    const target = session.current;
    if (target && target !== accountID) {
      await Auth.transfer({ fromAccountID: accountID, toAccountID: target });
      redirect(302, "/account/providers");
    }
  }

  await Actor.provide("account", { accountID, email }, async () => {
    await User.joinInvitedWorkspaces();
    const workspaces = await Workspace.forAccount(accountID);
    if (workspaces.length === 0) await Workspace.create({ name: "Default" });
  });

  await addAccountToSession(event, accountID, email);
  redirect(302, "/auth");
};
