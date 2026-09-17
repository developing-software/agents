#!/usr/bin/env bun

import { Account } from "@agents/core/account";
import { Actor } from "@agents/core/actor";
import { Api } from "@agents/core/api/api";
import { Auth } from "@agents/core/auth";
import { Database } from "@agents/core/drizzle";
import { User } from "@agents/core/user";
import { Workspace } from "@agents/core/workspace";
import { boxed } from "./utils/box";

const email = process.env.SEED_EMAIL ?? "dev@example.com";
const name = process.env.SEED_WORKSPACE ?? "Dev";

/**
 * Idempotent: reuses the dev account and its first workspace, and mints a fresh token each
 * run. Goes through core's own operations, so the rows are the ones a real login writes.
 */
async function seed() {
  const existing = await Auth.findByProviderOrEmail({ provider: "code", subject: email, email });
  const accountID = existing ?? (await Account.create({}));
  // The `code` row lets the emailed-code login land on this account.
  await Auth.upsertPair({ accountID, provider: "code", subject: email, email });

  const workspaceID = await Actor.provide("account", { accountID, email }, async () => {
    const [first] = await Workspace.forAccount(accountID);
    return first?.id ?? Workspace.create({ name });
  });

  const user = await User.fromAccount({ accountID, workspaceID });
  if (!user) throw new Error("Seeded workspace has no user for the dev account");

  const { token } = await Actor.provide(
    "user",
    { accountID, workspaceID, userID: user.id, role: user.role },
    () => Api.Personal.create({ name: "seed" }),
  );
  return { workspaceID, token };
}

const db = Database.connect();
const result = await Database.provide(db, seed);
await Database.release(db);

console.log(
  boxed([
    "SEED COMPLETE",
    "",
    `Email:     ${email}`,
    `Workspace: ${result.workspaceID}`,
    `Token:     ${result.token}`,
  ]),
);
