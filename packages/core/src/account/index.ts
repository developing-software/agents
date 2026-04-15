import { eq } from "drizzle-orm";
import { z } from "zod";
import { useTransaction } from "../drizzle/transaction";
import { fn } from "../util/fn";
import { Identifier } from "../identifier";
import { Common } from "../common";
import { Examples } from "../examples";
import { accountTable } from "./account.sql";
import { authTable } from "../auth/auth.sql";

export namespace Account {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.Id("account"),
      }),
    })
    .meta({
      ref: "Account",
      description: "A global identity that can own workspace memberships and provider links.",
    });
  export type Info = z.infer<typeof Info>;

  export const create = fn(
    z.object({ id: z.string().optional() }).default({}),
    async (input) => {
      const id = Identifier.create("account", input.id);
      await useTransaction((tx) => tx.insert(accountTable).values({ id }));
      return id;
    },
  );

  export const fromID = fn(Info.shape.id, (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(accountTable)
        .where(eq(accountTable.id, id))
        .then((rows) => rows.at(0)),
    ),
  );

  export const fromEmail = fn(z.string(), (email) =>
    useTransaction((tx) =>
      tx
        .select({ id: accountTable.id })
        .from(accountTable)
        .innerJoin(authTable, eq(authTable.accountID, accountTable.id))
        .where(eq(authTable.subject, email))
        .then((rows) => rows.at(0)),
    ),
  );
}
