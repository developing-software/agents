import { Database } from "@agents/core/drizzle";
import { Identity } from "@agents/core/identity";
import { Project } from "@agents/core/project";
import { Queue } from "@agents/core/queue";
import { Issue } from "@agents/core/issue";
import { db } from "./db";

const DAY = 86_400_000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString();

// Seeds a project and its issues straight into the DB. Issues are workspace-wide, so
// tests scope themselves to the returned project. Runs inside `Identity.provide` because
// `Issue.create` reads the actor, and inside `Queue.provide` because both writes publish —
// the app under test has its own queue port, this direct call needs one too.
export function seed(uid: string, titles: string[], name = "E2E") {
  return Database.provide(db, () =>
    Queue.provide(Queue.Providers.memory(), () =>
      Identity.provide("user", { userID: uid, role: "member" }, async () => {
        const { id } = await Project.create({ name: `${name} ${uid.slice(-6)}` });
        await Promise.all(
          titles.map((title, i) =>
            Issue.create({
              title,
              source: "project",
              sourceID: id,
              assignee: uid,
              stage: i % 2 === 0 ? "Sprint 1" : "Sprint 2",
              startDate: day(i),
              dueDate: day(i + 3),
            }),
          ),
        );
        return id;
      }),
    ),
  );
}
