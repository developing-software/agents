import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { Actor } from "../actor";
import { Common } from "../common";
import { createTransaction, useTransaction } from "../drizzle/transaction";
import { Examples } from "../examples";
import { githubInstallationTable } from "../github/installation/installation.sql";
import { Identifier } from "../identifier";
import { Log } from "../util/log";
import { repositoryTable } from "./repository.sql";

const log = Log.create({ namespace: "repository" });

export namespace Repository {
  export const Source = z.enum(["github"]).meta({
    description: "Repository source provider.",
    example: "github",
  });

  export type Source = z.infer<typeof Source>;

  export const Info = z
    .object({
      id: z.string().meta({
        description: Common.IdDescription,
        example: Examples.Repository.id,
      }),
      source: Source,
      sourceId: z.string().meta({
        description: "Provider repository identifier.",
        example: Examples.Repository.sourceId,
      }),
      owner: z.string().meta({
        description: "Repository owner login.",
        example: Examples.Repository.owner,
      }),
      repo: z.string().meta({
        description: "Repository name.",
        example: Examples.Repository.repo,
      }),
      fullName: z.string().meta({
        description: "Full repository name in `owner/repo` format.",
        example: Examples.Repository.fullName,
      }),
      defaultBranch: z.string().nullable().meta({
        description: "Default branch of the repository.",
        example: Examples.Repository.defaultBranch,
      }),
      installationId: z.number().int().meta({
        description: "GitHub installation identifier used to access this repository.",
        example: Examples.Repository.installationId,
      }),
    })
    .meta({
      ref: "Repository",
      description: "A connected source code repository.",
      example: Examples.Repository,
    });

  export type Info = z.infer<typeof Info>;

  export interface UpsertInput {
    userId?: string;
    source: Source;
    sourceId: string;
    connectionId: string;
    owner: string;
    repo: string;
    fullName: string;
    defaultBranch?: string;
  }

  const infoSelection = {
    id: repositoryTable.id,
    source: repositoryTable.source,
    sourceId: repositoryTable.sourceId,
    owner: repositoryTable.owner,
    repo: repositoryTable.repo,
    fullName: repositoryTable.fullName,
    defaultBranch: repositoryTable.defaultBranch,
    installationId: githubInstallationTable.installationId,
  };

  function serialize(row: {
    id: string;
    source: string;
    sourceId: string;
    owner: string;
    repo: string;
    fullName: string;
    defaultBranch: string | null;
    installationId: number;
  }): Info {
    return {
      id: row.id,
      source: row.source as Source,
      sourceId: row.sourceId,
      owner: row.owner,
      repo: row.repo,
      fullName: row.fullName,
      defaultBranch: row.defaultBranch ?? null,
      installationId: row.installationId,
    };
  }

  export async function upsert(input: UpsertInput) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select({ id: repositoryTable.id })
        .from(repositoryTable)
        .where(
          and(
            eq(repositoryTable.source, input.source),
            eq(repositoryTable.sourceId, input.sourceId),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (existing) {
        await tx
          .update(repositoryTable)
          .set({
            userId: input.userId,
            source: input.source,
            sourceId: input.sourceId,
            connectionId: input.connectionId,
            owner: input.owner,
            repo: input.repo,
            fullName: input.fullName,
            defaultBranch: input.defaultBranch,
            timeDeleted: null,
            timeUpdated: new Date(),
          })
          .where(eq(repositoryTable.id, existing.id));
        return existing.id;
      }

      const id = Identifier.create("repository");
      log.info("upsert repository", {
        source: input.source,
        sourceId: input.sourceId,
        fullName: input.fullName,
      });
      await tx.insert(repositoryTable).values({
        id,
        userId: input.userId,
        source: input.source,
        sourceId: input.sourceId,
        connectionId: input.connectionId,
        owner: input.owner,
        repo: input.repo,
        fullName: input.fullName,
        defaultBranch: input.defaultBranch,
      });
      return id;
    });
  }

  export async function removeByConnectionId(connectionId: string) {
    return useTransaction(async (tx) =>
      tx
        .update(repositoryTable)
        .set({ timeDeleted: new Date(), timeUpdated: new Date() })
        .where(eq(repositoryTable.connectionId, connectionId)),
    );
  }

  export async function removeBySourceId(source: Source, sourceId: string) {
    return useTransaction(async (tx) =>
      tx
        .update(repositoryTable)
        .set({ timeDeleted: new Date(), timeUpdated: new Date() })
        .where(and(eq(repositoryTable.source, source), eq(repositoryTable.sourceId, sourceId))),
    );
  }

  export async function removeByFullName(fullName: string) {
    return useTransaction(async (tx) =>
      tx
        .update(repositoryTable)
        .set({ timeDeleted: new Date(), timeUpdated: new Date() })
        .where(eq(repositoryTable.fullName, fullName)),
    );
  }

  export async function findBySourceId(source: Source, sourceId: string): Promise<Info | null> {
    return useTransaction(async (tx) =>
      tx
        .select(infoSelection)
        .from(repositoryTable)
        .innerJoin(
          githubInstallationTable,
          eq(repositoryTable.connectionId, githubInstallationTable.id),
        )
        .where(
          and(
            eq(repositoryTable.source, source),
            eq(repositoryTable.sourceId, sourceId),
            isNull(repositoryTable.timeDeleted),
          ),
        )
        .then((rows) => (rows[0] ? serialize(rows[0]) : null)),
    );
  }

  export async function findByID(id: string): Promise<Info | null> {
    const userID = Actor.userID();
    return useTransaction(async (tx) =>
      tx
        .select(infoSelection)
        .from(repositoryTable)
        .innerJoin(
          githubInstallationTable,
          eq(repositoryTable.connectionId, githubInstallationTable.id),
        )
        .where(
          and(
            eq(repositoryTable.id, id),
            eq(repositoryTable.userId, userID),
            isNull(repositoryTable.timeDeleted),
          ),
        )
        .then((rows) => (rows[0] ? serialize(rows[0]) : null)),
    );
  }

  export async function findByFullName(fullName: string): Promise<Info | null> {
    const userID = Actor.userID();
    return useTransaction(async (tx) =>
      tx
        .select(infoSelection)
        .from(repositoryTable)
        .innerJoin(
          githubInstallationTable,
          eq(repositoryTable.connectionId, githubInstallationTable.id),
        )
        .where(
          and(
            eq(repositoryTable.fullName, fullName),
            eq(repositoryTable.userId, userID),
            isNull(repositoryTable.timeDeleted),
          ),
        )
        .then((rows) => (rows[0] ? serialize(rows[0]) : null)),
    );
  }

  export async function findByFullNameForWebhook(fullName: string): Promise<Info | null> {
    return useTransaction(async (tx) =>
      tx
        .select(infoSelection)
        .from(repositoryTable)
        .innerJoin(
          githubInstallationTable,
          eq(repositoryTable.connectionId, githubInstallationTable.id),
        )
        .where(and(eq(repositoryTable.fullName, fullName), isNull(repositoryTable.timeDeleted)))
        .then((rows) => (rows[0] ? serialize(rows[0]) : null)),
    );
  }

  export async function list(): Promise<Info[]> {
    const userID = Actor.userID();
    return useTransaction(async (tx) =>
      tx
        .select(infoSelection)
        .from(repositoryTable)
        .innerJoin(
          githubInstallationTable,
          eq(repositoryTable.connectionId, githubInstallationTable.id),
        )
        .where(and(eq(repositoryTable.userId, userID), isNull(repositoryTable.timeDeleted)))
        .then((rows) => rows.map(serialize)),
    );
  }

  export async function listByOwner(owner: string): Promise<Info[]> {
    const userID = Actor.userID();
    return useTransaction(async (tx) =>
      tx
        .select(infoSelection)
        .from(repositoryTable)
        .innerJoin(
          githubInstallationTable,
          eq(repositoryTable.connectionId, githubInstallationTable.id),
        )
        .where(
          and(
            eq(repositoryTable.owner, owner),
            eq(repositoryTable.userId, userID),
            isNull(repositoryTable.timeDeleted),
          ),
        )
        .then((rows) => rows.map(serialize)),
    );
  }
}
