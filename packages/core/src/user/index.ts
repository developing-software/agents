import { eq, and, isNull, asc, inArray } from "drizzle-orm";
import { userTable } from "./user.sql";
import { z } from "zod";
import { fn } from "../util/fn";
import { createID } from "../util/id";
import { createTransaction, afterTx, useTransaction } from "../drizzle/transaction";
import { Common } from "../common";
import { Examples } from "../examples";

export namespace User {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.User.id,
      }),
      name: z.string().nullable().meta({
        description: "Name of the user.",
        example: Examples.User.name,
      }),
      email: z.string().nullable().meta({
        description: "Email address of the user.",
        example: Examples.User.email,
      }),
    })
    .meta({
      ref: "User",
      description: "A user.",
      example: Examples.User,
    });
  export type Info = z.infer<typeof Info>;


  export const create = fn(Info.pick({ email: true }), async (input) => {
    const id = createID("user");
    await createTransaction(async (tx) => {
      await tx.insert(userTable).values({
        id,
        email: input.email,
      });
    });
    return id;
  });

  export const merge = fn(z.string().array(), async (ids) => {
    const primary = ids.shift();
    if (!primary) throw new Error("No primary user");
    await useTransaction(async (tx) => {
      await tx.update(userTable).set({ timeDeleted: new Date() }).where(inArray(userTable.id, ids));
    });
    return primary;
  });

  export const update = fn(
    Info.pick({ name: true, email: true, id: true }).partial({
      name: true,
      email: true,
    }),
    (input) =>
      useTransaction(async (tx) => {
        await afterTx(() => {
          // bus.publish(Resource.Bus, Event.Updated, {
          //   userID: input.id,
          // }),
        });
        await tx
          .update(userTable)
          .set({
            name: input.name,
            email: input.email,
          })
          .where(eq(userTable.id, input.id));
      }),
  );

  export const fromID = fn(Info.shape.id, async (id) =>
    useTransaction((tx) =>
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, id))
        .then((rows) => rows.map(serialize).at(0)),
    ),
  );

  export const fromEmail = fn(z.string(), async (email) =>
    useTransaction(async (tx) =>
      tx
        .select()
        .from(userTable)
        .where(and(eq(userTable.email, email), isNull(userTable.timeDeleted)))
        .orderBy(asc(userTable.timeCreated))
        .then((rows) => rows.map(serialize)),
    ),
  );

  function serialize(input: typeof userTable.$inferSelect): z.infer<typeof Info> {
    return {
      id: input.id,
      name: input.name,
      email: input.email,
      // stripeCustomerID: input.stripeCustomerID,
    };
  }
}
