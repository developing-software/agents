import { and, eq, isNull } from "drizzle-orm";
import { createTransaction, useTransaction } from "../../drizzle/transaction";
import { Identifier } from "../../identifier";
import { Log } from "../../util/log";
import { githubInstallationTable } from "./installation.sql";

const log = Log.create({ namespace: "github.installation" });

export namespace GithubInstallation {
  export interface UpsertInput {
    userId?: string;
    installationId: number;
    owner: string;
  }

  export async function upsert(input: UpsertInput) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(githubInstallationTable)
        .where(eq(githubInstallationTable.installationId, input.installationId))
        .then((rows) => rows[0] ?? null);

      if (existing) {
        await tx
          .update(githubInstallationTable)
          .set({
            userId: input.userId,
            owner: input.owner,
            timeDeleted: null,
            timeUpdated: new Date(),
          })
          .where(eq(githubInstallationTable.id, existing.id));
        return existing.id;
      }

      const id = Identifier.create("githubInstallation");
      log.info("upsert installation", { installationId: input.installationId, owner: input.owner });
      await tx.insert(githubInstallationTable).values({
        id,
        userId: input.userId,
        installationId: input.installationId,
        owner: input.owner,
      });
      return id;
    });
  }

  export async function findByInstallationId(installationId: number) {
    return useTransaction(async (tx) =>
      tx
        .select()
        .from(githubInstallationTable)
        .where(
          and(
            eq(githubInstallationTable.installationId, installationId),
            isNull(githubInstallationTable.timeDeleted),
          ),
        )
        .then((rows) => rows[0] ?? null),
    );
  }

  export async function remove(installationId: number) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(githubInstallationTable)
        .where(eq(githubInstallationTable.installationId, installationId))
        .then((rows) => rows[0] ?? null);

      if (!existing) return null;

      log.info("remove installation", { installationId, id: existing.id });
      await tx
        .update(githubInstallationTable)
        .set({ timeDeleted: new Date(), timeUpdated: new Date() })
        .where(eq(githubInstallationTable.id, existing.id));
      return existing;
    });
  }
}
