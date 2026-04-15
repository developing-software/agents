import { it } from "bun:test";
import { Actor } from "../src/actor";
import { Account } from "../src/account";
import { Workspace } from "../src/workspace";

export function withTestAccount(name: string, cb: (accountID: string) => Promise<any>) {
  return it(name, async () => {
    const accountID = await Account.create({});
    await Actor.provide("account", { accountID, email: "test@example.com" }, async () => {
      await cb(accountID);
    });
  });
}

export function withTestWorkspace(
  name: string,
  cb: (ctx: { accountID: string; workspaceID: string; userID: string }) => Promise<any>,
) {
  return it(name, async () => {
    const accountID = await Account.create({});
    const email = "test@example.com";
    await Actor.provide("account", { accountID, email }, async () => {
      const workspaceID = await Workspace.create({ name: "Test" });
      const { userID, role } = await Workspace.assertMember({ accountID, workspaceID });
      await Actor.provide(
        "user",
        { accountID, workspaceID, userID, role },
        async () => cb({ accountID, workspaceID, userID }),
      );
    });
  });
}
