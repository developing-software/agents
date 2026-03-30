import { describe, it, expect } from "bun:test";
import { registerHandlers } from "../src/github/webhook/handlers";
import { Event } from "../src/events";
import { Tags } from "../src/events/types";
import { GithubInstallation } from "../src/github/installation";
import { Repository } from "../src/repository";

type AnyHandler = (event: { payload: any }) => Promise<void>;

function createTestWebhook() {
  const handlers = new Map<string, AnyHandler[]>();

  const webhook = {
    on(event: string, handler: AnyHandler) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
    },
    async trigger(event: string, payload: unknown) {
      for (const h of handlers.get(event) ?? []) {
        await h({ payload });
      }
    },
  };

  registerHandlers(webhook as any);
  return webhook;
}

let _installationSeq = 900000;

async function createTestRepo(sourceId: string, fullName: string) {
  const [owner, repo] = fullName.split("/") as [string, string];
  const connectionId = await GithubInstallation.upsert({
    installationId: _installationSeq++,
    owner,
  });
  return Repository.upsert({
    source: "github",
    sourceId,
    connectionId,
    owner,
    repo,
    fullName,
  });
}

function makePushPayload(overrides: Record<string, any> = {}) {
  return {
    repository: { id: 80000001, full_name: "octocat/push-test" },
    ref: "refs/heads/main",
    commits: [{ id: "abc" }, { id: "def" }],
    head_commit: { message: "fix: correct typo" },
    pusher: { name: "octocat" },
    ...overrides,
  };
}

describe("push webhook handler", () => {
  it("creates a push event with correct type and data", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000001", "octocat/push-test-1");

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000001, full_name: "octocat/push-test-1" },
        ref: "refs/heads/main",
        commits: [{ id: "a" }, { id: "b" }],
        head_commit: { message: "fix: correct typo" },
        pusher: { name: "octocat" },
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events.length).toBe(1);
    const event = events[0]!;
    expect(event.type).toBe("github.push");
    expect(event.origin).toBe("webhook");
    expect(event.data.branch).toBe("main");
    expect(event.data.commitCount).toBe(2);
    expect(event.data.lastCommit).toBe("fix: correct typo");
    expect(event.data.pusher).toBe("octocat");
  });

  it("sets correct tags including repo and branch, and stores commit metadata in data", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000002", "octocat/push-test-2");

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000002, full_name: "octocat/push-test-2" },
        ref: "refs/heads/feature/my-feature",
        commits: [{ id: "x" }],
        head_commit: { message: "feat: add new thing" },
        pusher: { name: "dev" },
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    const event = events[0]!;
    expect(event.tags).toContain(Tags.ghRepo("octocat/push-test-2"));
    expect(event.tags).toContain(Tags.ghBranch("feature/my-feature"));
    expect(event.data).toMatchObject({ commitCount: 1, lastCommit: "feat: add new thing" });
  });

  it("strips refs/heads/ prefix from branch name", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000003", "octocat/push-test-3");

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000003, full_name: "octocat/push-test-3" },
        ref: "refs/heads/dev",
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events[0]!.data.branch).toBe("dev");
    expect(events[0]!.tags).toContain(Tags.ghBranch("dev"));
  });

  it("truncates last commit message to 72 characters", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000004", "octocat/push-test-4");
    const longMessage = "a".repeat(100);

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000004, full_name: "octocat/push-test-4" },
        head_commit: { message: longMessage },
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events[0]!.data.lastCommit).toBe("a".repeat(72));
  });

  it("uses only the first line of a multi-line commit message", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000005", "octocat/push-test-5");

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000005, full_name: "octocat/push-test-5" },
        head_commit: { message: "feat: subject line\n\nDetailed body text here." },
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events[0]!.data.lastCommit).toBe("feat: subject line");
  });

  it("handles payload with no commits gracefully", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000006", "octocat/push-test-6");

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000006, full_name: "octocat/push-test-6" },
        commits: undefined,
        head_commit: undefined,
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events[0]!.data.commitCount).toBe(0);
    expect(events[0]!.data.lastCommit).toBe("");
  });

  it("skips event creation when repository is not found", async () => {
    const webhook = createTestWebhook();

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 99999999, full_name: "unknown/no-such-repo" },
      }),
    );

    const events = await Event.list({ tags: [Tags.ghRepo("unknown/no-such-repo")] });
    expect(events.length).toBe(0);
  });

  it("links push event to parent event on the same repo and branch", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000008", "octocat/push-test-8");

    const rootId = await Event.create({
      type: "github.issues.opened",
      origin: "webhook",
      source: "repository",
      sourceId: repoId,
      tags: [Tags.ghRepo("octocat/push-test-8"), Tags.ghBranch("main")],
    });

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000008, full_name: "octocat/push-test-8" },
        ref: "refs/heads/main",
      }),
    );

    const events = await Event.list({
      source: "repository",
      sourceId: repoId,
      type: "github.push",
    });
    expect(events[0]!.parentEventId).toBe(rootId);
  });

  it("creates a root push event when no prior event exists on the branch", async () => {
    const webhook = createTestWebhook();
    const repoId = await createTestRepo("80000009", "octocat/push-test-9");

    await webhook.trigger(
      "push",
      makePushPayload({
        repository: { id: 80000009, full_name: "octocat/push-test-9" },
        ref: "refs/heads/main",
      }),
    );

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events[0]!.parentEventId).toBeNull();
  });
});
