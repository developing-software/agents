import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { useTransaction } from "../drizzle/transaction";
import { fn } from "../util/fn";
import { Identifier } from "../identifier";
import { ErrorCodes, VisibleError } from "../error";
import { authTable } from "./auth.sql";

export namespace Auth {
  export const Provider = z.enum(["github", "google", "email", "code"]);
  export type Provider = z.infer<typeof Provider>;

  export const Info = z
    .object({
      id: z.string(),
      provider: Provider,
      subject: z.string(),
      accountID: z.string(),
    })
    .meta({
      ref: "AuthProvider",
      description: "A link between an account and a provider identity.",
    });
  export type Info = z.infer<typeof Info>;

  /**
   * Look up an account by either (provider, subject) or by the email pseudo-provider row.
   * Prefers a direct (provider, subject) match when both match.
   */
  export const findByProviderOrEmail = fn(
    z.object({ provider: Provider, subject: z.string(), email: z.string() }),
    ({ provider, subject, email }) =>
      useTransaction(async (tx) => {
        const matches = await tx
          .select({ provider: authTable.provider, accountID: authTable.accountID })
          .from(authTable)
          .where(
            or(
              and(eq(authTable.provider, provider), eq(authTable.subject, subject)),
              and(eq(authTable.provider, "email"), eq(authTable.subject, email)),
            ),
          );
        const byProvider = matches.find((x) => x.provider === provider)?.accountID;
        const byEmail = matches.find((x) => x.provider === "email")?.accountID;
        return byProvider ?? byEmail ?? null;
      }),
  );

  /**
   * Idempotently write both the (provider, subject) row and the (email, email) row
   * pointing at `accountID`.
   */
  export const upsertPair = fn(
    z.object({
      accountID: z.string(),
      provider: Provider,
      subject: z.string(),
      email: z.string(),
    }),
    async ({ accountID, provider, subject, email }) => {
      await useTransaction(async (tx) => {
        await tx
          .insert(authTable)
          .values({ id: Identifier.create("auth"), provider, subject, accountID })
          .onConflictDoNothing({ target: [authTable.provider, authTable.subject] });
        if (provider !== "email") {
          await tx
            .insert(authTable)
            .values({
              id: Identifier.create("auth"),
              provider: "email",
              subject: email,
              accountID,
            })
            .onConflictDoNothing({ target: [authTable.provider, authTable.subject] });
        }
      });
    },
  );

  export const listByAccount = fn(z.string(), (accountID) =>
    useTransaction((tx) =>
      tx
        .select({
          id: authTable.id,
          provider: authTable.provider,
          subject: authTable.subject,
          accountID: authTable.accountID,
        })
        .from(authTable)
        .where(eq(authTable.accountID, accountID)),
    ),
  );

  /**
   * Remove one auth row. Refuses when it would leave the account with no non-email
   * provider (i.e., orphan the account).
   */
  export const remove = fn(
    z.object({ id: z.string(), accountID: z.string() }),
    async ({ id, accountID }) => {
      await useTransaction(async (tx) => {
        const rows = await tx
          .select({ id: authTable.id, provider: authTable.provider })
          .from(authTable)
          .where(eq(authTable.accountID, accountID));
        const target = rows.find((r) => r.id === id);
        if (!target)
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            "Auth row not found",
          );
        if (target.provider !== "email") {
          const remainingNonEmail = rows.filter(
            (r) => r.id !== id && r.provider !== "email",
          ).length;
          if (remainingNonEmail === 0)
            throw new VisibleError(
              "validation",
              ErrorCodes.Validation.INVALID_STATE,
              "Cannot unlink the last sign-in provider",
            );
        }
        await tx.delete(authTable).where(eq(authTable.id, id));
      });
    },
  );
}
