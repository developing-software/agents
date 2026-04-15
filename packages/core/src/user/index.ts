import { and, asc, eq, isNull } from "drizzle-orm";
import { userTable } from "./user.sql";
import { z } from "zod";
import { fn } from "../util/fn";
import { Identifier } from "../identifier";
import { useTransaction } from "../drizzle/transaction";
import { Actor } from "../actor";
import { Common } from "../common";
import { Examples } from "../examples";
import { ErrorCodes, VisibleError } from "../error";

export namespace User {
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
    useTransaction((tx) =>
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
      useTransaction((tx) =>
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
    useTransaction((tx) =>
      tx
        .update(userTable)
        .set({ timeSeen: new Date(), timeUpdated: new Date() })
        .where(eq(userTable.id, userID)),
    ),
  );

  /**
   * Under an account actor, claim any user rows that were invited by email but
   * not yet linked to an account (accountID IS NULL, email matches).
   */
  export async function joinInvitedWorkspaces() {
    const account = Actor.assert("account");
    await useTransaction((tx) =>
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
      const id = Identifier.create("user");
      await useTransaction((tx) =>
        tx.insert(userTable).values({
          id,
          workspaceID: actor.properties.workspaceID,
          email: input.email,
          role: input.role,
        }),
      );
      return id;
    },
  );

  export const update = fn(
    z.object({ id: z.string(), name: z.string().optional(), avatarUrl: z.string().optional() }),
    (input) =>
      useTransaction(async (tx) => {
        await tx
          .update(userTable)
          .set({
            name: input.name,
            avatarUrl: input.avatarUrl,
            timeUpdated: new Date(),
          })
          .where(eq(userTable.id, input.id));
      }),
  );

  export const listForWorkspace = fn(z.string(), (workspaceID) =>
    useTransaction((tx) =>
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
