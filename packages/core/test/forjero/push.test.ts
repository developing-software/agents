import { describe, expect, it } from "bun:test";
import { Event } from "../../src/events";
import { Tags } from "../../src/events/tag";
import { Installation } from "../../src/git/installation";
import { handleForjeroWebhook } from "../../src/git/provider/forjero/webhook";
import { Repository } from "../../src/repository";

let _installationSeq = 950000;

async function createTestRepo(sourceId: string, fullName: string) {
  const [owner, repo] = fullName.split("/") as [string, string];
  const installationRef = `forjero-pat-${_installationSeq++}`;
  const installationId = await Installation.upsert({
    provider: "forjero",
    providerAccountId: installationRef,
    providerAccountLogin: owner,
    installationRef,
    accountType: "User",
    meta: { baseUrl: "https://codeberg.org" },
  });
  const repoId = await Repository.upsert({
    source: "forjero",
    sourceId,
    installationId,
    owner,
    repo,
    fullName,
  });
  return { repoId, installationId };
}

function makePushPayload(overrides: Record<string, any> = {}) {
  return {
    repository: { id: 81000001, full_name: "octocat/forjero-push-1" },
    ref: "refs/heads/main",
    commits: [{ id: "abc" }, { id: "def" }],
    head_commit: { message: "fix: correct typo" },
    pusher: { username: "octocat", login: "octocat" },
    ...overrides,
  };
}

describe("forjero push webhook handler", () => {
  it("creates a forjero.push event with correct type and data", async () => {
    const { repoId, installationId } = await createTestRepo(
      "81000001",
      "octocat/forjero-push-1",
    );

    await handleForjeroWebhook({
      installationId,
      eventName: "push",
      payload: makePushPayload({
        repository: { id: 81000001, full_name: "octocat/forjero-push-1" },
        ref: "refs/heads/main",
        commits: [{ id: "a" }, { id: "b" }],
        head_commit: { message: "fix: correct typo" },
      }),
    });

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events.length).toBe(1);
    const event = events[0]!;
    expect(event.type).toBe("forjero.push");
    expect(event.origin).toBe("webhook");
    expect(event.data.branch).toBe("main");
    expect(event.data.commitCount).toBe(2);
    expect(event.data.lastCommit).toBe("fix: correct typo");
    expect(event.data.pusher).toBe("octocat");
  });

  it("tags the event with repo and branch", async () => {
    const { repoId, installationId } = await createTestRepo(
      "81000002",
      "octocat/forjero-push-2",
    );

    await handleForjeroWebhook({
      installationId,
      eventName: "push",
      payload: makePushPayload({
        repository: { id: 81000002, full_name: "octocat/forjero-push-2" },
        ref: "refs/heads/feature/my-feature",
      }),
    });

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events[0]!.tags).toContain(Tags.ghRepo("octocat/forjero-push-2"));
    expect(events[0]!.tags).toContain(Tags.ghBranch("feature/my-feature"));
  });

  it("skips event creation when repository is not registered", async () => {
    await handleForjeroWebhook({
      installationId: "missing-install",
      eventName: "push",
      payload: makePushPayload({
        repository: { id: 81009999, full_name: "ghosts/no-such-forjero-repo" },
      }),
    });

    const events = await Event.list({
      tags: [Tags.ghRepo("ghosts/no-such-forjero-repo")],
    });
    expect(events.length).toBe(0);
  });

  it("dispatches issues opened events with parent inference", async () => {
    const { repoId, installationId } = await createTestRepo(
      "81000003",
      "octocat/forjero-issues-1",
    );

    await handleForjeroWebhook({
      installationId,
      eventName: "issues",
      payload: {
        action: "opened",
        repository: { id: 81000003, full_name: "octocat/forjero-issues-1" },
        issue: { number: 7, title: "first issue", body: "hello", state: "open" },
      },
    });

    const events = await Event.list({ source: "repository", sourceId: repoId });
    expect(events.length).toBe(1);
    expect(events[0]!.type).toBe("forjero.issues.opened");
    expect(events[0]!.tags).toContain(Tags.ghRepo("octocat/forjero-issues-1"));
    expect(events[0]!.tags).toContain(Tags.ghIssue(7));
    expect(events[0]!.data.title).toBe("first issue");
  });
});
