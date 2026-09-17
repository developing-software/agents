import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";
import { Database } from "../drizzle";
import { fn } from "../util/fn";
import { Identifier } from "../identifier";
import { Actor } from "../actor";
import { ErrorCodes, VisibleError } from "../error";
import { Common } from "../common";
import { Examples } from "../examples";
import { workspaceTable } from "./workspace.sql";
import { userTable } from "../user/user.sql";

export namespace Workspace {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.Id("workspace"),
      }),
      name: z.string(),
      slug: z.string().nullable(),
    })
    .meta({
      ref: "Workspace",
      description: "A workspace that groups users, repositories, and settings.",
    });
  export type Info = z.infer<typeof Info>;

  export const create = fn(
    z.object({ name: z.string().min(1), slug: z.string().optional() }),
    async (input) => {
      const account = Actor.assert("account");
      const id = Identifier.create("workspace");
      await Database.transaction(async (tx) => {
        await tx.insert(workspaceTable).values({ id, name: input.name, slug: input.slug ?? null });
        await tx.insert(userTable).values({
          id: Identifier.create("user"),
          workspaceID: id,
          accountID: account.properties.accountID,
          email: account.properties.email,
          role: "admin",
        });
      });
      return id;
    },
  );

  export const fromID = fn(Info.shape.id, (id) =>
    Database.use((tx) =>
      tx
        .select()
        .from(workspaceTable)
        .where(and(eq(workspaceTable.id, id), isNull(workspaceTable.timeDeleted)))
        .then((rows) => rows.at(0) ?? null),
    ),
  );

  export const assertMember = fn(
    z.object({ accountID: z.string(), workspaceID: z.string() }),
    ({ accountID, workspaceID }) =>
      Database.use(async (tx) => {
        const row = await tx
          .select({ id: userTable.id, role: userTable.role })
          .from(userTable)
          .where(
            and(
              eq(userTable.workspaceID, workspaceID),
              eq(userTable.accountID, accountID),
              isNull(userTable.timeDeleted),
            ),
          )
          .then((rows) => rows.at(0));
        if (!row)
          throw new VisibleError(
            "forbidden",
            ErrorCodes.Permission.FORBIDDEN,
            "Not a member of this workspace",
          );
        return { userID: row.id, role: row.role };
      }),
  );

  /**
   * Like assertMember, but searches across multiple logged-in accounts and returns
   * whichever one has a membership in this workspace. Used by console withActor
   * to pick the active account based on workspace membership.
   */
  export const findMember = fn(
    z.object({ accountIDs: z.array(z.string()).min(1), workspaceID: z.string() }),
    ({ accountIDs, workspaceID }) =>
      Database.use((tx) =>
        tx
          .select({
            userID: userTable.id,
            accountID: userTable.accountID,
            role: userTable.role,
          })
          .from(userTable)
          .where(
            and(
              eq(userTable.workspaceID, workspaceID),
              isNotNull(userTable.accountID),
              inArray(userTable.accountID, accountIDs),
              isNull(userTable.timeDeleted),
            ),
          )
          .limit(1)
          .then((rows) => rows.at(0) ?? null),
      ),
  );

  export const forAccount = fn(z.string(), (accountID) =>
    Database.use((tx) =>
      tx
        .select({
          id: workspaceTable.id,
          name: workspaceTable.name,
          slug: workspaceTable.slug,
        })
        .from(workspaceTable)
        .innerJoin(userTable, eq(userTable.workspaceID, workspaceTable.id))
        .where(
          and(
            eq(userTable.accountID, accountID),
            isNull(userTable.timeDeleted),
            isNull(workspaceTable.timeDeleted),
          ),
        ),
    ),
  );

  export const lastSeenID = fn(z.string(), (accountID) =>
    Database.use((tx) =>
      tx
        .select({ workspaceID: userTable.workspaceID })
        .from(userTable)
        .where(and(eq(userTable.accountID, accountID), isNull(userTable.timeDeleted)))
        .orderBy(desc(userTable.timeSeen))
        .limit(1)
        .then((rows) => rows.at(0)?.workspaceID ?? null),
    ),
  );
}
