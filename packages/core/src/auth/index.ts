import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { useTransaction } from "../drizzle/transaction";
import { fn } from "../util/fn";
import { Identifier } from "../identifier";
import { ErrorCodes, VisibleError } from "../error";
import { authTable } from "./auth.sql";
import { userTable } from "../user/user.sql";
import { accountTable } from "../account/account.sql";

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

  /**
   * Move all auth rows and user rows from `fromAccountID` to `toAccountID`,
   * then delete the source account. Used when a user adds a second provider
   * via the link flow — the issuer created (or matched) a scratch account for
   * the new provider, which must be merged into the session's existing account.
   */
  export const transfer = fn(
    z.object({ fromAccountID: z.string(), toAccountID: z.string() }),
    async ({ fromAccountID, toAccountID }) => {
      if (fromAccountID === toAccountID) return;
      await useTransaction(async (tx) => {
        const targetAuth = await tx
          .select({ provider: authTable.provider, subject: authTable.subject })
          .from(authTable)
          .where(eq(authTable.accountID, toAccountID));
        const ownedAuth = new Set(targetAuth.map((r) => `${r.provider}:${r.subject}`));

        const sourceAuth = await tx
          .select({
            id: authTable.id,
            provider: authTable.provider,
            subject: authTable.subject,
          })
          .from(authTable)
          .where(eq(authTable.accountID, fromAccountID));

        for (const row of sourceAuth) {
          if (ownedAuth.has(`${row.provider}:${row.subject}`)) {
            await tx.delete(authTable).where(eq(authTable.id, row.id));
          } else {
            await tx
              .update(authTable)
              .set({ accountID: toAccountID })
              .where(eq(authTable.id, row.id));
          }
        }

        const targetWorkspaces = await tx
          .select({ workspaceID: userTable.workspaceID })
          .from(userTable)
          .where(eq(userTable.accountID, toAccountID));
        const ownedWorkspaces = new Set(targetWorkspaces.map((r) => r.workspaceID));

        const sourceUsers = await tx
          .select({ id: userTable.id, workspaceID: userTable.workspaceID })
          .from(userTable)
          .where(eq(userTable.accountID, fromAccountID));

        for (const row of sourceUsers) {
          if (ownedWorkspaces.has(row.workspaceID)) {
            await tx.delete(userTable).where(eq(userTable.id, row.id));
          } else {
            await tx
              .update(userTable)
              .set({ accountID: toAccountID })
              .where(eq(userTable.id, row.id));
          }
        }

        await tx.delete(accountTable).where(eq(accountTable.id, fromAccountID));
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
