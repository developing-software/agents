import { and, eq } from "drizzle-orm";
import { useTransaction, createTransaction } from "../../drizzle/transaction";
import { createID } from "../../util/id";
import { Log } from "../../util/log";
import { GitHub } from "../client";
import { githubIssueTable } from "./repo.sql";

const log = Log.create({ namespace: "github.issue" });

export namespace GithubIssue {
  export interface UpsertInput {
    repoId: string;
    number: number;
    title: string;
    state: string;
    labels: string[];
    body?: string;
  }

  export async function upsert(input: UpsertInput) {
    return createTransaction(async (tx) => {
      const existing = await tx
        .select()
        .from(githubIssueTable)
        .where(
          and(eq(githubIssueTable.repoId, input.repoId), eq(githubIssueTable.number, input.number)),
        )
        .then((rows) => rows[0]);

      if (existing) {
        await tx
          .update(githubIssueTable)
          .set({
            title: input.title,
            state: input.state,
            labels: input.labels,
            body: input.body ?? null,
            timeUpdated: new Date(),
          })
          .where(eq(githubIssueTable.id, existing.id));
        return existing.id;
      }

      log.info("upsert issue", { repoId: input.repoId, number: input.number, state: input.state });
      const id = createID("githubIssue");
      await tx.insert(githubIssueTable).values({
        id,
        repoId: input.repoId,
        number: input.number,
        title: input.title,
        state: input.state,
        labels: input.labels,
        body: input.body,
      });
      return id;
    });
  }

  export async function findByRepoAndNumber(repoId: string, number: number) {
    return await useTransaction(
      async (tx) =>
        await tx
          .select()
          .from(githubIssueTable)
          .where(and(eq(githubIssueTable.repoId, repoId), eq(githubIssueTable.number, number)))
          .then((rows) => rows[0] ?? null),
    );
  }

  export async function listByRepo(repo: { installationId: number; owner: string; repo: string }) {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.issues.listForRepo({
      owner: repo.owner,
      repo: repo.repo,
      state: "all",
      per_page: 100,
    });
    return data
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map((l) => (typeof l === "string" ? l : (l.name ?? ""))),
        body: i.body ?? undefined,
      }));
  }
}
