import { describe, it, expect } from "bun:test";
import { Event } from "../src/events";
import { Tags } from "../src/events/types";
import { createID } from "../src/util/id";

function testSourceId() {
  return createID("repository");
}

describe("event", () => {
  it("create and fromID", async () => {
    const id = await Event.create({ type: "test.created", origin: "cli" });
    const event = await Event.fromID(id);
    expect(event).toBeDefined();
    expect(event!.type).toBe("test.created");
  });

  it("list by source", async () => {
    const sourceId = testSourceId();
    await Event.create({ type: "test.a", origin: "cli", source: "github_repo", sourceId });
    await Event.create({ type: "test.b", origin: "cli", source: "github_repo", sourceId });
    const events = await Event.list({ source: "github_repo", sourceId });
    expect(events.length).toBeGreaterThanOrEqual(2);
  });

  it("list by tags", async () => {
    await Event.create({ type: "test.tagged", origin: "cli", tags: [Tags.ghIssue(99)] });
    const events = await Event.list({ tags: [Tags.ghIssue(99)] });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.tags).toContain("gh:issue:99");
  });

  it("listTree", async () => {
    const sourceId = testSourceId();
    const rootId = await Event.create({
      type: "root",
      origin: "cli",
      source: "github_repo",
      sourceId,
    });
    const childId = await Event.create({
      type: "child",
      origin: "cli",
      source: "github_repo",
      sourceId,
      parentEventId: rootId,
    });
    await Event.create({
      type: "grandchild",
      origin: "cli",
      source: "github_repo",
      sourceId,
      parentEventId: childId,
    });

    const tree = await Event.listTree({ source: "github_repo", sourceId });
    const root = tree.find((n) => n.id === rootId);
    expect(root).toBeDefined();
    expect(root!.children).toHaveLength(1);
    expect(root!.children[0]?.id).toBe(childId);
    expect(root!.children[0]?.children).toHaveLength(1);
  });

  it("infers parent from issue tags when parentEventId is null", async () => {
    const sourceId = testSourceId();
    const tags = [Tags.ghRepo("octocat/hello-world"), Tags.ghIssue(42)];
    const rootId = await Event.create({
      type: "github.issues.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags,
    });

    const childId = await Event.create({
      type: "agent.started",
      origin: "action",
      source: "repository",
      sourceId,
      parentEventId: undefined,
      tags: [...tags, Tags.ghBranch("agents/issue-42")],
    });

    const child = await Event.fromID(childId);
    expect(child?.parentEventId).toBe(rootId);
  });

  it("prefers PR parent inference over issue parent inference", async () => {
    const sourceId = testSourceId();
    const repoTag = Tags.ghRepo("octocat/hello-world");
    await Event.create({
      type: "github.issues.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags: [repoTag, Tags.ghIssue(42)],
    });
    const prRootId = await Event.create({
      type: "github.pull_request.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags: [repoTag, Tags.ghPr(99), Tags.ghBranch("feature/pr-99")],
    });

    const childId = await Event.create({
      type: "agent.completed",
      origin: "action",
      source: "repository",
      sourceId,
      parentEventId: undefined,
      tags: [repoTag, Tags.ghIssue(42), Tags.ghPr(99), Tags.ghBranch("feature/pr-99")],
    });

    const child = await Event.fromID(childId);
    expect(child?.parentEventId).toBe(prRootId);
  });

  it("keeps an explicit parentEventId instead of inferring one", async () => {
    const sourceId = testSourceId();
    const tags = [Tags.ghRepo("octocat/hello-world"), Tags.ghIssue(42)];
    await Event.create({
      type: "github.issues.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags,
    });
    const explicitParentId = await Event.create({
      type: "manual.root",
      origin: "cli",
      source: "repository",
      sourceId,
    });

    const childId = await Event.create({
      type: "agent.started",
      origin: "action",
      source: "repository",
      sourceId,
      parentEventId: explicitParentId,
      tags,
    });

    const child = await Event.fromID(childId);
    expect(child?.parentEventId).toBe(explicitParentId);
  });
});
