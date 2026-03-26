import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { useTransaction, createTransaction } from "../../drizzle/transaction";
import { createID } from "../../util/id";
import { Log } from "../../util/log";
import { Actor } from "../../actor";
import { Common } from "../../common";
import { Examples } from "../../examples";
import { githubRepoTable } from "./repo.sql";

const log = Log.create({ namespace: "github.repo" });

export namespace GithubRepo {
  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.GithubRepo.id,
      }),
      owner: z.string().meta({
        description: "Repository owner login.",
        example: Examples.GithubRepo.owner,
      }),
      repo: z.string().meta({
        description: "Repository name.",
        example: Examples.GithubRepo.repo,
      }),
      fullName: z.string().meta({
        description: "Full repository name in `owner/repo` format.",
        example: Examples.GithubRepo.fullName,
      }),
      defaultBranch: z.string().nullable().meta({
        description: "Default branch of the repository.",
        example: Examples.GithubRepo.defaultBranch,
      }),
    })
    .meta({
      ref: "GithubRepo",
      description: "A connected GitHub repository.",
      example: Examples.GithubRepo,
    });

  export type Info = z.infer<typeof Info>;

  export interface UpsertInput {
    userId?: string;
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
            userId: input.userId,
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
        userId: input.userId,
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
    return await useTransaction(
      async (tx) =>
        await tx
          .update(githubRepoTable)
          .set({ timeDeleted: new Date() })
          .where(eq(githubRepoTable.installationId, installationId)),
    );
  }

  export async function removeByFullName(fullName: string) {
    log.info("remove repo by fullName", { fullName });
    return await useTransaction(
      async (tx) =>
        await tx
          .update(githubRepoTable)
          .set({ timeDeleted: new Date() })
          .where(eq(githubRepoTable.fullName, fullName)),
    );
  }

  export async function findByInstallationId(installationId: number) {
    return await useTransaction(
      async (tx) =>
        await tx
          .select()
          .from(githubRepoTable)
          .where(eq(githubRepoTable.installationId, installationId))
          .then((rows) => rows[0] ?? null),
    );
  }

  export async function findByFullName(fullName: string) {
    const userID = Actor.userID();
    return await useTransaction(
      async (tx) =>
        await tx
          .select()
          .from(githubRepoTable)
          .where(
            and(
              eq(githubRepoTable.fullName, fullName),
              eq(githubRepoTable.userId, userID),
              isNull(githubRepoTable.timeDeleted),
            ),
          )
          .then((rows) => rows[0] ?? null),
    );
  }

  export async function list(): Promise<Info[]> {
    const userID = Actor.userID();
    return await useTransaction(
      async (tx) =>
        await tx
          .select()
          .from(githubRepoTable)
          .where(and(eq(githubRepoTable.userId, userID), isNull(githubRepoTable.timeDeleted)))
          .then((rows) => rows.map(serialize)),
    );
  }

  export async function listByOwner(owner: string): Promise<Info[]> {
    const userID = Actor.userID();
    return await useTransaction(
      async (tx) =>
        await tx
          .select()
          .from(githubRepoTable)
          .where(
            and(
              eq(githubRepoTable.owner, owner),
              eq(githubRepoTable.userId, userID),
              isNull(githubRepoTable.timeDeleted),
            ),
          )
          .then((rows) => rows.map(serialize)),
    );
  }

  export function serialize(row: typeof githubRepoTable.$inferSelect): Info {
    return {
      id: row.id,
      owner: row.owner,
      repo: row.repo,
      fullName: row.fullName,
      defaultBranch: row.defaultBranch ?? null,
    };
  }
}
