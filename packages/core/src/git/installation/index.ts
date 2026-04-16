import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { Common } from "../../common";
import { createTransaction, useTransaction } from "../../drizzle/transaction";
import { Examples } from "../../examples";
import { Identifier } from "../../identifier";
import { Log } from "../../util/log";
import { installationsTable } from "../installation.sql";

const log = Log.create({ namespace: "git.installation" });

export namespace Installation {
  export const Provider = z.enum(["github", "gitlab", "bitbucket", "gitea"]).meta({
    description: "Git provider identifier.",
    example: "github",
  });
  export type Provider = z.infer<typeof Provider>;

  export const AccountType = z.enum(["Organization", "User"]).meta({
    description: "Account type on the provider.",
    example: "Organization",
  });
  export type AccountType = z.infer<typeof AccountType>;

  export const Info = z
    .object({
      id: z.string().meta({ description: Common.IdDescription, example: Examples.Installation.id }),
      provider: Provider,
      providerAccountId: z.string().meta({
        description: "Provider's account identifier (org/user id).",
        example: Examples.Installation.providerAccountId,
      }),
      providerAccountLogin: z.string().meta({
        description: "Provider's account login (org/user slug).",
        example: Examples.Installation.providerAccountLogin,
      }),
      installationRef: z.string().nullable().meta({
        description:
          "Provider-specific installation reference. GitHub: installation_id; GitLab: group_id; Gitea: base_url.",
        example: Examples.Installation.installationRef,
      }),
      accountType: AccountType,
      active: z.boolean(),
      meta: z.unknown().nullable(),
    })
    .meta({ ref: "Installation", description: "A provider installation on an account." });
  export type Info = z.infer<typeof Info>;

  export interface UpsertInput {
    accountId?: string;
    provider: Provider;
    providerAccountId: string;
    providerAccountLogin: string;
    installationRef?: string | null;
    accountType: string;
    meta?: unknown;
  }

  export async function upsert(input: UpsertInput) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select({ id: installationsTable.id })
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.provider, input.provider),
            eq(installationsTable.providerAccountId, input.providerAccountId),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (existing) {
        await tx
          .update(installationsTable)
          .set({
            accountId: input.accountId,
            providerAccountLogin: input.providerAccountLogin,
            installationRef: input.installationRef ?? null,
            accountType: input.accountType,
            meta: input.meta ?? null,
            active: true,
            suspendedAt: null,
            timeDeleted: null,
            timeUpdated: new Date(),
          })
          .where(eq(installationsTable.id, existing.id));
        return existing.id;
      }

      const id = Identifier.create("installation");
      log.info("upsert installation", {
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        providerAccountLogin: input.providerAccountLogin,
      });
      await tx.insert(installationsTable).values({
        id,
        accountId: input.accountId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        providerAccountLogin: input.providerAccountLogin,
        installationRef: input.installationRef ?? null,
        accountType: input.accountType,
        meta: input.meta ?? null,
      });
      return id;
    });
  }

  export async function findByID(id: string) {
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(installationsTable)
        .where(and(eq(installationsTable.id, id), isNull(installationsTable.timeDeleted)))
        .then((rows) => rows[0] ?? null),
    );
  }

  export async function findByInstallationRef(provider: Provider, installationRef: string) {
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.provider, provider),
            eq(installationsTable.installationRef, installationRef),
            isNull(installationsTable.timeDeleted),
          ),
        )
        .then((rows) => rows[0] ?? null),
    );
  }

  export async function findByProviderAccountId(provider: Provider, providerAccountId: string) {
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.provider, provider),
            eq(installationsTable.providerAccountId, providerAccountId),
            isNull(installationsTable.timeDeleted),
          ),
        )
        .then((rows) => rows[0] ?? null),
    );
  }

  export async function remove(provider: Provider, installationRef: string) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.provider, provider),
            eq(installationsTable.installationRef, installationRef),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (!existing) return null;

      log.info("remove installation", { provider, installationRef, id: existing.id });
      await tx
        .update(installationsTable)
        .set({ active: false, timeDeleted: new Date(), timeUpdated: new Date() })
        .where(eq(installationsTable.id, existing.id));
      return existing;
    });
  }
}
