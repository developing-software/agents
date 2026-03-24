import { and, eq, desc } from "drizzle-orm";
import { useTransaction, createTransaction } from "../../drizzle/transaction";
import { createID } from "../../util/id";
import { Log } from "../../util/log";
import { githubPullRequestTable } from "./repo.sql";

const log = Log.create({ namespace: "github.pull_request" });

export namespace GithubPullRequest {
  export interface UpsertInput {
    repoId: string;
    number: number;
    title: string;
    state: string;
    headBranch: string;
    baseBranch: string;
    issueId?: string;
  }

  export async function upsert(input: UpsertInput) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(githubPullRequestTable)
        .where(
          and(
            eq(githubPullRequestTable.repoId, input.repoId),
            eq(githubPullRequestTable.number, input.number),
          ),
        )
        .then((rows) => rows[0]);

      if (existing) {
        await tx
          .update(githubPullRequestTable)
          .set({
            title: input.title,
            state: input.state,
            headBranch: input.headBranch,
            baseBranch: input.baseBranch,
            issueId: input.issueId ?? existing.issueId,
            timeUpdated: new Date(),
          })
          .where(eq(githubPullRequestTable.id, existing.id));
        return existing.id;
      }

      log.info("upsert pull_request", {
        repoId: input.repoId,
        number: input.number,
        state: input.state,
      });
      const id = createID("githubPullRequest");
      await tx.insert(githubPullRequestTable).values({
        id,
        repoId: input.repoId,
        number: input.number,
        title: input.title,
        state: input.state,
        headBranch: input.headBranch,
        baseBranch: input.baseBranch,
        issueId: input.issueId,
      });
      return id;
    });
  }

  export async function findByRepoAndNumber(repoId: string, number: number) {
    return await useTransaction(async (tx) =>
      await tx
        .select()
        .from(githubPullRequestTable)
        .where(
          and(eq(githubPullRequestTable.repoId, repoId), eq(githubPullRequestTable.number, number)),
        )
        .then((rows) => rows[0] ?? null),
    );
  }

  export async function listByRepo(repoId: string) {
    return await useTransaction(async (tx) =>
      await tx
        .select()
        .from(githubPullRequestTable)
        .where(eq(githubPullRequestTable.repoId, repoId))
        .orderBy(desc(githubPullRequestTable.timeUpdated)),
    );
  }
}
