import { and, asc, eq, isNull } from "drizzle-orm";
import { userTable } from "./user.sql";
import { z } from "zod";
import { Database } from "../drizzle";
import { fn } from "../util/fn";
import { Identifier } from "../identifier";
import { Actor } from "../actor";
import { Account } from "../account";
import { Common } from "../common";
import { Examples } from "../examples";
import { ErrorCodes, VisibleError } from "../error";
import { Workspace } from "../workspace";
import { Template } from "../email/template";
import { Log } from "../util/log";

export namespace User {
  const log = Log.create({ namespace: "user" });

  export const Role = z.enum(["admin", "member"]);
  export type Role = z.infer<typeof Role>;

  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.User.id,
      }),
      workspaceID: z.string(),
      accountID: z.string().nullable(),
      email: z.string().nullable(),
      name: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      role: Role,
    })
    .meta({
      ref: "User",
      description: "A workspace membership tying an account (or a pending invite) to a workspace.",
    });
  export type Info = z.infer<typeof Info>;

  export const fromID = fn(Info.shape.id, (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(userTable)
        .where(and(eq(userTable.id, id), isNull(userTable.timeDeleted)))
        .then((rows) => rows.map(serialize).at(0) ?? null),
    ),
  );

  export const fromAccount = fn(
    z.object({ accountID: z.string(), workspaceID: z.string() }),
    ({ accountID, workspaceID }) =>
      Database.use((tx) =>
        tx
          .select()
          .from(userTable)
          .where(
            and(
              eq(userTable.accountID, accountID),
              eq(userTable.workspaceID, workspaceID),
              isNull(userTable.timeDeleted),
            ),
          )
          .then((rows) => rows.map(serialize).at(0) ?? null),
      ),
  );

  export const touchSeen = fn(z.string(), (userID) =>
    Database.use((tx) =>
      tx
        .update(userTable)
        .set({ timeSeen: new Date(), timeUpdated: new Date() })
        .where(eq(userTable.id, userID)),
    ),
  );

  /**
   * Under an account actor, claim any user rows that were invited by email but
   * not yet linked to an account (accountID IS NULL, email matches). The email
   * column stays populated as a per-seat snapshot of the invited address.
   */
  export async function joinInvitedWorkspaces() {
    const account = Actor.assert("account");
    await Database.use((tx) =>
      tx
        .update(userTable)
        .set({ accountID: account.properties.accountID, timeUpdated: new Date() })
        .where(
          and(
            eq(userTable.email, account.properties.email),
            isNull(userTable.accountID),
            isNull(userTable.timeDeleted),
          ),
        ),
    );
  }

  export const pendingByEmail = fn(
    z.object({ workspaceID: z.string(), email: z.string() }),
    ({ workspaceID, email }) =>
      Database.use((tx) =>
        tx
          .select()
          .from(userTable)
          .where(
            and(
              eq(userTable.workspaceID, workspaceID),
              eq(userTable.email, email),
              isNull(userTable.accountID),
              isNull(userTable.timeDeleted),
            ),
          )
          .then((rows) => rows.map(serialize).at(0) ?? null),
      ),
  );


  export const invite = fn(
    z.object({ email: z.email(), role: Role.default("member") }),
    async (input) => {
      const actor = Actor.assert("user");
      if (actor.properties.role !== "admin")
        throw new VisibleError(
          "forbidden",
          ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
          "Only admins can invite users",
        );
      const workspaceID = actor.properties.workspaceID;

      const account = await Account.fromEmail(input.email);
      if (account) {
        const existing = await fromAccount({ accountID: account.id, workspaceID });
        if (existing) return existing.id;
      }

      const pending = await pendingByEmail({ workspaceID, email: input.email });
      if (pending) return pending.id;

      const id = Identifier.create("user");
      await Database.use((tx) =>
        tx.insert(userTable).values({
          id,
          workspaceID,
          email: input.email,
          role: input.role,
        }),
      );

      // Send invite email (fire-and-forget — don't block on email delivery)
      const inviter = await fromID(actor.properties.userID);
      const workspace = await Workspace.fromID(workspaceID);
      if (workspace) {
        await Template.sendInvite({
          email: input.email,
          workspaceName: workspace.name,
          inviterEmail: inviter?.email ?? "A team member",
        }).catch((err) =>
          log.warn("failed to send invite email", {
            err: err instanceof Error ? err.message : String(err),
          }),
        );
      }

      return id;
    },
  );

  export const update = fn(
    z.object({ id: z.string(), name: z.string().optional(), avatarUrl: z.string().optional() }),
    (input) => {
      const actor = Actor.assert("user");
      return Database.use(async (tx) => {
        await tx
          .update(userTable)
          .set({
            name: input.name,
            avatarUrl: input.avatarUrl,
            timeUpdated: new Date(),
          })
          .where(
            and(
              eq(userTable.id, input.id),
              eq(userTable.workspaceID, actor.properties.workspaceID),
            ),
          );
      });
    },
  );

  export const remove = fn(z.string(), async (targetUserID) => {
    const actor = Actor.assert("user");
    if (actor.properties.role !== "admin")
      throw new VisibleError(
        "forbidden",
        ErrorCodes.Permission.INSUFFICIENT_PERMISSIONS,
        "Only admins can remove members",
      );
    if (actor.properties.userID === targetUserID)
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.INVALID_PARAMETER,
        "You cannot remove yourself",
      );

    const result = await Database.use((tx) =>
      tx
        .update(userTable)
        .set({ timeDeleted: new Date(), timeUpdated: new Date() })
        .where(
          and(
            eq(userTable.id, targetUserID),
            eq(userTable.workspaceID, actor.properties.workspaceID),
            isNull(userTable.timeDeleted),
          ),
        )
        .returning({ id: userTable.id }),
    );
    if (result.length === 0)
      throw new VisibleError(
        "not_found",
        ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
        "Member not found",
      );
  });

  export const listForWorkspace = fn(z.string(), (workspaceID) =>
    Database.use((tx) =>
      tx
        .select()
        .from(userTable)
        .where(and(eq(userTable.workspaceID, workspaceID), isNull(userTable.timeDeleted)))
        .orderBy(asc(userTable.timeCreated))
        .then((rows) => rows.map(serialize)),
    ),
  );

  function serialize(input: typeof userTable.$inferSelect): Info {
    return {
      id: input.id,
      workspaceID: input.workspaceID,
      accountID: input.accountID ?? null,
      email: input.email ?? null,
      name: input.name ?? null,
      avatarUrl: input.avatarUrl ?? null,
      role: input.role,
    };
  }
}
