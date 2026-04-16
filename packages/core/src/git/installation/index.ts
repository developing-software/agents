import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { Actor } from "../../actor";
import { Common } from "../../common";
import { createTransaction, useTransaction } from "../../drizzle/transaction";
import { Examples } from "../../examples";
import { ErrorCodes, VisibleError } from "../../error";
import { Identifier } from "../../identifier";
import { repositoryTable } from "../../repository/repository.sql";
import { Log } from "../../util/log";
import { installationsTable } from "../installation.sql";

const log = Log.create({ namespace: "git.installation" });

export namespace Installation {
  export const Provider = z.enum(["github", "gitlab", "bitbucket", "gitea", "forjero"]).meta({
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
      workspaceId: z.string().nullable(),
      accountType: AccountType,
      active: z.boolean(),
      meta: z.unknown().nullable(),
    })
    .meta({ ref: "Installation", description: "A provider installation on an account." });
  export type Info = z.infer<typeof Info>;

  export interface UpsertInput {
    workspaceId?: string | null;
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
        .select({
          id: installationsTable.id,
          workspaceId: installationsTable.workspaceId,
        })
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
            workspaceId: input.workspaceId ?? existing.workspaceId ?? null,
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
        workspaceId: input.workspaceId ?? null,
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

  export async function fromID(id: string): Promise<Info | null> {
    const workspaceId = Actor.workspaceID();
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.id, id),
            eq(installationsTable.workspaceId, workspaceId),
            isNull(installationsTable.timeDeleted),
          ),
        )
        .then((rows) => rows.map(serialize).at(0) ?? null),
    );
  }

  export async function fromIDForWebhook(id: string): Promise<Info | null> {
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(installationsTable)
        .where(and(eq(installationsTable.id, id), isNull(installationsTable.timeDeleted)))
        .then((rows) => rows.map(serialize).at(0) ?? null),
    );
  }

  export async function findByInstallationRef(
    provider: Provider,
    installationRef: string,
  ): Promise<Info | null> {
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
        .then((rows) => rows.map(serialize).at(0) ?? null),
    );
  }

  export async function findByProviderAccountId(
    provider: Provider,
    providerAccountId: string,
  ): Promise<Info | null> {
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
        .then((rows) => rows.map(serialize).at(0) ?? null),
    );
  }

  export async function listForWorkspace(): Promise<Info[]> {
    const workspaceId = Actor.workspaceID();
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.workspaceId, workspaceId),
            isNull(installationsTable.timeDeleted),
          ),
        )
        .then((rows) => rows.map(serialize)),
    );
  }

  export async function claim(input: {
    provider: Provider;
    installationRef: string;
    workspaceId: string;
  }) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.provider, input.provider),
            eq(installationsTable.installationRef, input.installationRef),
            isNull(installationsTable.timeDeleted),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (!existing) {
        throw new VisibleError(
          "not_found",
          ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
          "Installation not found",
        );
      }

      if (existing.workspaceId && existing.workspaceId !== input.workspaceId) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.INVALID_PARAMETER,
          "Installation already linked to another workspace",
        );
      }

      await tx
        .update(installationsTable)
        .set({
          workspaceId: input.workspaceId,
          timeUpdated: new Date(),
        })
        .where(eq(installationsTable.id, existing.id));

      await tx
        .update(repositoryTable)
        .set({
          workspaceId: input.workspaceId,
          timeUpdated: new Date(),
        })
        .where(eq(repositoryTable.installationId, existing.id));

      return existing.id;
    });
  }

  export async function setSuspended(
    provider: Provider,
    installationRef: string,
    suspended: boolean,
  ) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select({ id: installationsTable.id })
        .from(installationsTable)
        .where(
          and(
            eq(installationsTable.provider, provider),
            eq(installationsTable.installationRef, installationRef),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      await tx
        .update(installationsTable)
        .set({
          active: !suspended,
          suspendedAt: suspended ? new Date() : null,
          timeUpdated: new Date(),
        })
        .where(eq(installationsTable.id, existing.id));
      return existing.id;
    });
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
      return serialize(existing);
    });
  }

  function serialize(input: typeof installationsTable.$inferSelect): Info {
    return {
      id: input.id,
      provider: input.provider as Provider,
      providerAccountId: input.providerAccountId,
      providerAccountLogin: input.providerAccountLogin,
      installationRef: input.installationRef ?? null,
      workspaceId: input.workspaceId ?? null,
      accountType: input.accountType as AccountType,
      active: input.active,
      meta: input.meta ?? null,
    };
  }
}
