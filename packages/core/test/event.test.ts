import { describe, it, expect } from "bun:test";
import { Event } from "../src/events";
import { Tags } from "../src/events/types";

describe("event", () => {
  it("create and fromID", async () => {
    const id = await Event.create({ type: "test.created", origin: "cli" });
    const event = await Event.fromID(id);
    expect(event).toBeDefined();
    expect(event!.type).toBe("test.created");
  });

  it("list by source", async () => {
    const sourceId = "grp_test";
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
    const sourceId = "grp_tree_test";
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
});
