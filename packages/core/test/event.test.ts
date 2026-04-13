import { describe, it, expect } from "bun:test";
import { Event } from "../src/events";
import { Tags } from "../src/events/tag";
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
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      parentEventId: undefined,
      tags: [...tags, Tags.ghBranch("agents/issue-42")],
    });

    const child = await Event.fromID(childId);
    expect(child?.parentEventId).toBe(rootId);
  });

  it("does not infer agent as parent of another agent", async () => {
    const sourceId = testSourceId();
    const tags = [Tags.ghRepo("octocat/hello-world"), Tags.ghIssue(16)];

    const firstAgentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags,
    });

    const secondAgentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags,
    });

    const first = await Event.fromID(firstAgentId);
    const second = await Event.fromID(secondAgentId);
    expect(first?.parentEventId).toBeNull();
    expect(second?.parentEventId).toBeNull();
  });

  it("agent parents under github.issues.opened, not under another agent", async () => {
    const sourceId = testSourceId();
    const tags = [Tags.ghRepo("octocat/hello-world"), Tags.ghIssue(16)];

    const issueEventId = await Event.create({
      type: "github.issues.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags,
    });

    const firstAgentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags,
    });

    const secondAgentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags,
    });

    const first = await Event.fromID(firstAgentId);
    const second = await Event.fromID(secondAgentId);
    expect(first?.parentEventId).toBe(issueEventId);
    expect(second?.parentEventId).toBe(issueEventId);
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
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      parentEventId: undefined,
      tags: [repoTag, Tags.ghIssue(42), Tags.ghPr(99), Tags.ghBranch("feature/pr-99")],
    });

    const child = await Event.fromID(childId);
    expect(child?.parentEventId).toBe(prRootId);
  });

  it("update merges data and replaces tags", async () => {
    const id = await Event.create({
      type: "agent",
      origin: "action",
      data: { runUrl: "https://example.com", trigger: "push" },
      tags: [Tags.ghRepo("octocat/hello")],
    });
    await Event.update(id, {
      data: { workflow: { durationMs: 5000, conclusion: "success" } },
      tags: [Tags.ghRepo("octocat/hello"), Tags.ghPr(42)],
    });
    const event = await Event.fromID(id);
    expect(event!.data.runUrl).toBe("https://example.com");
    expect((event!.data.workflow as any).durationMs).toBe(5000);
    expect(event!.tags).toContain(Tags.ghPr(42));
    expect(event!.tags).toContain(Tags.ghRepo("octocat/hello"));
  });

  it("infers parent from plan tag", async () => {
    const sourceId = testSourceId();
    const planId = await Event.create({
      type: "plan",
      origin: "console",
      source: "repository",
      sourceId,
      tags: [Tags.ghRepo("octocat/hello-world")],
      data: { title: "Test plan", body: "...", status: "implementing", authorType: "human" },
    });

    const agentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags: [`plan:${planId}`, Tags.ghRepo("octocat/hello-world")],
    });

    const agent = await Event.fromID(agentId);
    expect(agent?.parentEventId).toBe(planId);
  });

  it("plan tag takes priority over issue tag inference", async () => {
    const sourceId = testSourceId();
    const tags = [Tags.ghRepo("octocat/hello-world"), Tags.ghIssue(42)];

    const issueEventId = await Event.create({
      type: "github.issues.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags,
    });

    const planId = await Event.create({
      type: "plan",
      origin: "console",
      source: "repository",
      sourceId,
      tags: [Tags.ghRepo("octocat/hello-world")],
      data: { title: "Plan", body: "...", status: "implementing", authorType: "human" },
    });

    const agentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags: [`plan:${planId}`, ...tags],
    });

    const agent = await Event.fromID(agentId);
    expect(agent?.parentEventId).toBe(planId);
    // Not the issue event
    expect(agent?.parentEventId).not.toBe(issueEventId);
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
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      parentEventId: explicitParentId,
      tags,
    });

    const child = await Event.fromID(childId);
    expect(child?.parentEventId).toBe(explicitParentId);
  });

  it("deploy event parents under agent with same PR tag", async () => {
    const sourceId = testSourceId();
    const repoTag = Tags.ghRepo("octocat/hello-world");
    const prTag = Tags.ghPr(200);

    // Webhook event (root)
    const webhookId = await Event.create({
      type: "github.pull_request.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags: [repoTag, prTag],
    });

    // Agent event (child of webhook, created the PR)
    const agentId = await Event.create({
      type: "agent",
      origin: "action",
      source: "repository",
      sourceId,
      tags: [repoTag, prTag, Tags.ghBranch("claude/issue-200")],
    });
    const agent = await Event.fromID(agentId);
    expect(agent?.parentEventId).toBe(webhookId);

    // Deploy event should parent under the agent, not the webhook
    const deployId = await Event.create({
      type: "deploy",
      origin: "action",
      source: "repository",
      sourceId,
      tags: [repoTag, prTag, "env:pr-200", "tool:sst"],
    });

    const deploy = await Event.fromID(deployId);
    expect(deploy?.parentEventId).toBe(agentId);
  });

  it("deploy event falls back to webhook parent when no agent has PR tag", async () => {
    const sourceId = testSourceId();
    const repoTag = Tags.ghRepo("octocat/hello-world");
    const prTag = Tags.ghPr(201);

    // Webhook event (root, no agent with this PR)
    const webhookId = await Event.create({
      type: "github.pull_request.opened",
      origin: "webhook",
      source: "repository",
      sourceId,
      tags: [repoTag, prTag],
    });

    // Deploy event should fall back to the webhook parent
    const deployId = await Event.create({
      type: "deploy",
      origin: "action",
      source: "repository",
      sourceId,
      tags: [repoTag, prTag, "env:pr-201", "tool:sst"],
    });

    const deploy = await Event.fromID(deployId);
    expect(deploy?.parentEventId).toBe(webhookId);
  });
});
