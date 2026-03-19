import { eq } from "drizzle-orm";
import { db } from "../../drizzle/index";
import { createTransaction } from "../../drizzle/transaction";
import { createID } from "../../util/id";
import { Log } from "../../util/log";
import { githubRepoTable } from "./repo.sql";

const log = Log.create({ namespace: "github.repo" });

export namespace GithubRepo {
  export interface UpsertInput {
    installationId: number;
    owner: string;
    repo: string;
    fullName: string;
    defaultBranch?: string;
  }

  export async function upsert(input: UpsertInput) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(githubRepoTable)
        .where(eq(githubRepoTable.installationId, input.installationId))
        .then((rows) => rows[0]);

      if (existing) {
        await tx
          .update(githubRepoTable)
          .set({
            owner: input.owner,
            repo: input.repo,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            timeDeleted: null,
            timeUpdated: new Date(),
          })
          .where(eq(githubRepoTable.id, existing.id));
        return existing.id;
      }

      log.info("upsert repo", { installationId: input.installationId, fullName: input.fullName });
      const id = createID("githubRepo");
      await tx.insert(githubRepoTable).values({
        id,
        installationId: input.installationId,
        owner: input.owner,
        repo: input.repo,
        fullName: input.fullName,
        defaultBranch: input.defaultBranch,
      });
      return id;
    });
  }

  export async function remove(installationId: number) {
    log.info("remove repo", { installationId });
    await db
      .update(githubRepoTable)
      .set({ timeDeleted: new Date() })
      .where(eq(githubRepoTable.installationId, installationId));
  }

  export async function removeByFullName(fullName: string) {
    log.info("remove repo by fullName", { fullName });
    await db
      .update(githubRepoTable)
      .set({ timeDeleted: new Date() })
      .where(eq(githubRepoTable.fullName, fullName));
  }

  export async function findByInstallationId(installationId: number) {
    return db
      .select()
      .from(githubRepoTable)
      .where(eq(githubRepoTable.installationId, installationId))
      .then((rows) => rows[0] ?? null);
  }

  export async function findByFullName(fullName: string) {
    return db
      .select()
      .from(githubRepoTable)
      .where(eq(githubRepoTable.fullName, fullName))
      .then((rows) => rows.find((r) => !r.timeDeleted) ?? null);
  }
}
