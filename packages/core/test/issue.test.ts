import { describe, expect } from "bun:test";
import { Identity } from "../src/identity";
import { Permission } from "../src/permission";
import { Insights, Issue } from "../src/issue";
import { Identifier } from "../src/identifier";
import { withTestUser } from "./util";

// Issues are visible to everyone, so tests that count rows scope themselves to a
// throwaway source instead of relying on the actor.
const project = () => ({ source: "project", sourceID: Identifier.create("project") });

describe("issue", () => {
  withTestUser("create and fetch an issue", async ({ userID }) => {
    const { id } = await Issue.create({ title: "Write the report" });
    const issue = await Issue.fromID(id);
    expect(issue?.title).toBe("Write the report");
    expect(issue?.status).toBe("backlog");
    expect(issue?.reason).toBeNull();
    expect(issue?.createdBy).toBe(userID);
    expect(issue?.assignee).toBeNull();
    expect(issue?.timeStarted).toBeNull();
  });

  withTestUser("list scopes to the owning entity", async () => {
    const src = project();
    await Issue.create({ title: "First", ...src });
    await Issue.create({ title: "Second", ...src });
    await Issue.create({ title: "Elsewhere", ...project() });
    const page = await Issue.list(src);
    expect(page.data.map((issue) => issue.title).sort()).toEqual(["First", "Second"]);
    expect(page.total).toBe(2);
  });

  withTestUser("list filters by status, assignee and stage", async ({ userID }) => {
    const src = project();
    const { id: mine } = await Issue.create({
      title: "Mine",
      assignee: userID,
      stage: "Sprint 1",
      ...src,
    });
    await Issue.create({ title: "Nobody's", ...src });
    await Issue.update({ id: mine, status: "active" });

    expect((await Issue.list({ ...src, status: "active" })).data.map((t) => t.id)).toEqual([mine]);
    expect((await Issue.list({ ...src, assignee: userID })).data.map((t) => t.id)).toEqual([mine]);
    expect((await Issue.list({ ...src, assignee: "none" })).data).toHaveLength(1);
    expect((await Issue.list({ ...src, stage: "Sprint 1" })).data.map((t) => t.id)).toEqual([mine]);
    expect((await Issue.list({ ...src, stage: "none" })).data).toHaveLength(1);
  });

  withTestUser("starting stamps the actual start, finishing stamps the end", async () => {
    const { id } = await Issue.create({ title: "Do the thing" });

    await Issue.update({ id, status: "active" });
    const started = await Issue.fromID(id);
    expect(started?.timeStarted).not.toBeNull();
    expect(started?.timeDone).toBeNull();

    // Blocking keeps the original start, so a resumed task doesn't look brand new.
    await Issue.update({ id, status: "blocked", reason: "waiting on design" });
    expect((await Issue.fromID(id))?.timeStarted).toBe(started!.timeStarted);
    expect((await Issue.fromID(id))?.reason).toBe("waiting on design");

    await Issue.update({ id, status: "active" });
    expect((await Issue.fromID(id))?.timeStarted).toBe(started!.timeStarted);
    expect((await Issue.fromID(id))?.reason).toBeNull();

    await Issue.update({ id, status: "done", reason: "completed" });
    const done = await Issue.fromID(id);
    expect(done?.timeDone).not.toBeNull();
    expect(done?.timeStarted).toBe(started!.timeStarted);
  });

  withTestUser("falling back to backlog means it never started", async () => {
    const { id } = await Issue.create({ title: "False start", status: "active" });
    expect((await Issue.fromID(id))?.timeStarted).not.toBeNull();

    await Issue.update({ id, status: "backlog" });
    const issue = await Issue.fromID(id);
    expect(issue?.timeStarted).toBeNull();
    expect(issue?.timeDone).toBeNull();
  });

  withTestUser("assignment joins the user back in", async ({ userID }) => {
    const { id } = await Issue.create({ title: "Hand it over" });
    await Issue.update({ id, assignee: userID });
    expect((await Issue.fromID(id))?.assignee).toMatchObject({ id: userID, name: "Test User" });

    await Issue.update({ id, assignee: null });
    expect((await Issue.fromID(id))?.assignee).toBeNull();
  });

  withTestUser("stages derive their span and counts from their issues", async () => {
    const src = project();
    await Issue.create({
      title: "Kickoff",
      stage: "Discovery",
      startDate: "2026-01-05T00:00:00.000Z",
      dueDate: "2026-01-09T00:00:00.000Z",
      ...src,
    });
    const { id: late } = await Issue.create({
      title: "Wrap up",
      stage: "Discovery",
      startDate: "2026-01-07T00:00:00.000Z",
      dueDate: "2026-01-20T00:00:00.000Z",
      ...src,
    });
    await Issue.create({
      title: "Build it",
      stage: "Delivery",
      startDate: "2026-02-02T00:00:00.000Z",
      dueDate: "2026-02-20T00:00:00.000Z",
      ...src,
    });
    await Issue.create({ title: "Unstaged", ...src });
    await Issue.update({ id: late, status: "done" });

    const stages = await Issue.stages(src);
    expect(stages.map((stage) => stage.name)).toEqual(["Discovery", "Delivery"]);
    expect(stages[0]).toMatchObject({
      total: 2,
      done: 1,
      start: "2026-01-05T00:00:00.000Z",
      end: "2026-01-20T00:00:00.000Z",
    });
  });

  withTestUser("renaming a stage moves every issue wearing it", async () => {
    const src = project();
    await Issue.create({ title: "One", stage: "Sprint 1", ...src });
    await Issue.create({ title: "Two", stage: "Sprint 1", ...src });
    await Issue.rename({ from: "Sprint 1", to: "Sprint 2", ...src });

    const stages = await Issue.stages(src);
    expect(stages.map((stage) => stage.name)).toEqual(["Sprint 2"]);
    expect(stages[0]?.total).toBe(2);
  });

  withTestUser("tags are trimmed and deduped", async () => {
    const { id } = await Issue.create({ title: "Tagged", tags: [" work ", "urgent", "urgent"] });
    expect((await Issue.fromID(id))?.tags).toEqual(["work", "urgent"]);
  });

  withTestUser("list paginates results", async () => {
    const src = project();
    for (let i = 0; i < 3; i++) await Issue.create({ title: `Issue ${i}`, ...src });
    const firstPage = await Issue.list({ ...src, page: 1, pageSize: 2 });
    const secondPage = await Issue.list({ ...src, page: 2, pageSize: 2 });
    expect(firstPage.data).toHaveLength(2);
    expect(secondPage.data).toHaveLength(1);
    expect(firstPage.total).toBe(3);
  });

  withTestUser("remove soft-deletes the issue", async () => {
    const { id } = await Issue.create({ title: "Temporary" });
    await Issue.remove(id);
    const issue = await Issue.fromID(id);
    expect(issue).toBeNull();
  });

  withTestUser("a signed-out caller is denied", async () => {
    const { id } = await Issue.create({ title: "Private" });
    await Identity.provide("public", {}, async () => {
      // `list` guards before it touches a promise; `remove` is async, so the identical
      // throw surfaces as a rejection.
      expect(() => Issue.list({})).toThrow(/issue:read/);
      expect(() => Insights.stats({ start: "2026-01-01", end: "2026-01-31" })).toThrow(
        /issue:read/,
      );
      await expect(Issue.remove(id)).rejects.toThrow(/issue:read/);
    });
  });

  withTestUser("sub-issues join the parent's owner, last among siblings", async () => {
    const src = project();
    const epic = await Issue.create({ title: "Epic", ...src });
    const first = await Issue.create({ title: "First", parentID: epic.id });
    const second = await Issue.create({ title: "Second", parentID: epic.id });
    expect(first.source).toBe("project");
    expect(first.sourceID).toBe(src.sourceID);
    expect([first.position, second.position]).toEqual([0, 1]);
    const kids = await Issue.list({ parentID: epic.id, sort: ["position"] });
    expect(kids.data.map((issue) => issue.title)).toEqual(["First", "Second"]);
    expect((await Issue.list({ ...src, parentID: "none" })).data.map((t) => t.id)).toEqual([
      epic.id,
    ]);
  });

  withTestUser("move reorders siblings and refuses cycles", async () => {
    const src = project();
    const epic = await Issue.create({ title: "Epic", ...src });
    const a = await Issue.create({ title: "A", parentID: epic.id });
    const b = await Issue.create({ title: "B", parentID: epic.id });
    const c = await Issue.create({ title: "C", parentID: epic.id });

    await Issue.move({ id: c.id, parentID: epic.id, position: 0 });
    const order = await Issue.list({ parentID: epic.id, sort: ["position"] });
    expect(order.data.map((issue) => issue.title)).toEqual(["C", "A", "B"]);

    // Out to the top level: the gap closes behind it.
    await Issue.move({ id: a.id, parentID: null });
    expect((await Issue.fromID(a.id))?.position).toBe(1);
    expect((await Issue.fromID(b.id))?.position).toBe(1);

    await Issue.move({ id: b.id, parentID: c.id });
    await expect(Issue.move({ id: epic.id, parentID: b.id })).rejects.toThrow(/under itself/);
    await expect(
      Issue.move({ id: b.id, parentID: (await Issue.create({ title: "Other", ...project() })).id }),
    ).rejects.toThrow(/same owner/);
  });

  withTestUser("removing a parent promotes its sub-issues", async () => {
    const src = project();
    const epic = await Issue.create({ title: "Epic", ...src });
    const kid = await Issue.create({ title: "Kid", parentID: epic.id });
    await Issue.remove(epic.id);
    const after = await Issue.fromID(kid.id);
    expect(after?.parentID).toBeNull();
    expect(after?.position).toBe(0);
  });

  withTestUser("annotations merge and drop keys; links swap without touching them", async () => {
    const { id } = await Issue.create({ title: "Annotated", links: [{ url: "https://a.dev" }] });
    await Issue.annotate({ id, set: { "example.com/a": "1", "example.com/b": "2" } });
    const after = await Issue.annotate({ id, unset: ["example.com/a"] });
    expect(after.metadata.annotations).toEqual({ "example.com/b": "2" });

    await Issue.update({ id, links: [{ url: "https://b.dev", title: "B" }] });
    const issue = await Issue.fromID(id);
    expect(issue?.metadata.links).toEqual([{ url: "https://b.dev", title: "B" }]);
    expect(issue?.metadata.annotations).toEqual({ "example.com/b": "2" });
  });

  withTestUser("concurrent link edits all land; a repeated url retitles", async () => {
    const { id } = await Issue.create({ title: "Linked" });
    await Promise.all(
      ["a", "b", "c"].map((name) => Issue.link({ id, url: `https://${name}.dev` })),
    );
    await Issue.link({ id, url: "https://b.dev", title: "B" });
    const after = await Issue.unlink({ id, url: "https://a.dev" });
    expect(after.metadata.links.map((item) => item.url).sort()).toEqual([
      "https://b.dev",
      "https://c.dev",
    ]);
    expect(after.metadata.links.find((item) => item.url === "https://b.dev")?.title).toBe("B");
  });

  withTestUser("github annotations belong to the sync engine, one issue per issue", async () => {
    const { id } = await Issue.create({ title: "Mirrored" });
    await expect(Issue.annotate({ id, set: { "github.com/issue": "acme/api#1" } })).rejects.toThrow(
      /written by their integration/,
    );

    const issue = String(Math.floor(Math.random() * 1e9));
    const other = await Issue.create({ title: "Duplicate" });
    await Identity.internal("test", Permission.all, async () => {
      await Issue.annotate({ id, set: { "github.com/issue-id": issue } });
      await expect(
        Issue.annotate({ id: other.id, set: { "github.com/issue-id": issue } }),
      ).rejects.toThrow();
    });
  });

  withTestUser("system bypasses enforcement", async () => {
    const { id } = await Issue.create({ title: "Batch" });
    await Identity.internal("test", Permission.all, async () => {
      await Issue.update({ id, title: "Renamed by a job" });
      expect((await Issue.fromID(id))?.title).toBe("Renamed by a job");
    });
  });
});
