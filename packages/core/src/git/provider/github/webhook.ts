import type { EmitterWebhookEvent, EmitterWebhookEventName } from "@octokit/webhooks";
import { Event } from "../../../events/index";
import { Tags } from "../../../events/tag";
import { Repository } from "../../../repository/index";
import { Log } from "../../../util/log";
import { Installation } from "../../installation";

interface WebhookEmitter {
  on<E extends EmitterWebhookEventName>(
    eventName: E,
    handler: (event: EmitterWebhookEvent<E>) => Promise<void> | void,
  ): void;
}

const log = Log.create({ namespace: "git.webhook.github" });

function accountLogin(account: unknown): string {
  if (account && typeof account === "object" && "login" in account) {
    const value = (account as { login?: unknown }).login;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function accountType(account: unknown): string {
  if (account && typeof account === "object" && "type" in account) {
    const value = (account as { type?: unknown }).type;
    return typeof value === "string" ? value : "Organization";
  }
  return "Organization";
}

function providerAccountId(installation: { id: number; account: unknown }): string {
  const account = installation.account;
  if (account && typeof account === "object" && "id" in account) {
    const id = (account as { id?: unknown }).id;
    if (typeof id === "number" || typeof id === "string") return String(id);
  }
  return String(installation.id);
}

export function registerGithubWebhookHandlers(webhook: WebhookEmitter): void {
  webhook.on("installation.created", async ({ payload }) => {
    const login = accountLogin(payload.installation.account);
    log.info("installation created", { installationId: payload.installation.id, login });
    const installationId = await Installation.upsert({
      provider: "github",
      providerAccountId: providerAccountId(payload.installation),
      providerAccountLogin: login,
      installationRef: String(payload.installation.id),
      accountType: accountType(payload.installation.account),
    });
    for (const r of payload.repositories ?? []) {
      await Repository.upsert({
        source: "github",
        sourceId: String(r.id),
        installationId,
        owner: login,
        repo: r.name,
        fullName: r.full_name,
      });
    }
  });

  webhook.on("installation.deleted", async ({ payload }) => {
    log.info("installation deleted", { installationId: payload.installation.id });
    const installation = await Installation.remove("github", String(payload.installation.id));
    if (!installation) return;
    await Repository.removeByInstallationId(installation.id);
  });

  webhook.on("installation_repositories.added", async ({ payload }) => {
    const login = accountLogin(payload.installation.account);
    log.info("repositories added", {
      installationId: payload.installation.id,
      count: payload.repositories_added.length,
    });
    const installationId = await Installation.upsert({
      provider: "github",
      providerAccountId: providerAccountId(payload.installation),
      providerAccountLogin: login,
      installationRef: String(payload.installation.id),
      accountType: accountType(payload.installation.account),
    });
    for (const r of payload.repositories_added) {
      await Repository.upsert({
        source: "github",
        sourceId: String(r.id),
        installationId,
        owner: login,
        repo: r.name,
        fullName: r.full_name,
      });
    }
  });

  webhook.on("installation_repositories.removed", async ({ payload }) => {
    log.info("repositories removed", {
      installationId: payload.installation.id,
      count: payload.repositories_removed.length,
    });
    for (const r of payload.repositories_removed) {
      await Repository.removeBySourceId("github", String(r.id));
      await Repository.removeByFullName(r.full_name);
    }
  });

  webhook.on("issues", async ({ payload }) => {
    log.info("issue event", {
      action: payload.action,
      repo: payload.repository.full_name,
      number: payload.issue.number,
    });
    const repo =
      (await Repository.findBySourceId("github", String(payload.repository.id))) ??
      (await Repository.findByFullNameForWebhook(payload.repository.full_name));
    if (!repo) return;

    const issueTags = [Tags.ghRepo(repo.fullName), Tags.ghIssue(payload.issue.number)];
    const parentEventId =
      payload.action !== "opened"
        ? await Event.findParent({
            source: "repository",
            sourceId: repo.id,
            tags: issueTags,
            excludeTypePrefix: "agent.",
          })
        : undefined;

    await Event.create({
      source: "repository",
      sourceId: repo.id,
      origin: "webhook",
      type: `github.issues.${payload.action}`,
      tags: issueTags,
      parentEventId,
      data: {
        title: payload.issue.title,
        state: payload.issue.state ?? "",
        labels: (payload.issue.labels ?? []).map((l) =>
          l && typeof l === "object" ? (l.name ?? "") : String(l),
        ),
        body: payload.issue.body ?? null,
      },
    });
  });

  webhook.on("pull_request", async ({ payload }) => {
    const repo =
      (await Repository.findBySourceId("github", String(payload.repository.id))) ??
      (await Repository.findByFullNameForWebhook(payload.repository.full_name));

    log.info("pull_request event", {
      action: payload.action,
      repo: payload.repository.full_name,
      number: payload.pull_request.number,
    });

    if (!repo) return;

    const prTags = [
      Tags.ghRepo(repo.fullName),
      Tags.ghPr(payload.pull_request.number),
      Tags.ghBranch(payload.pull_request.head.ref),
    ];
    const parentEventId =
      payload.action !== "opened"
        ? await Event.findParent({
            source: "repository",
            sourceId: repo.id,
            tags: prTags,
            excludeTypePrefix: "agent.",
          })
        : undefined;

    await Event.create({
      source: "repository",
      sourceId: repo.id,
      origin: "webhook",
      type: `github.pull_request.${payload.action}`,
      tags: prTags,
      parentEventId,
      data: {
        title: payload.pull_request.title,
        state: payload.pull_request.merged ? "merged" : payload.pull_request.state,
        headBranch: payload.pull_request.head.ref,
        baseBranch: payload.pull_request.base.ref,
      },
    });
  });

  webhook.on("push", async ({ payload }) => {
    const repo =
      (await Repository.findBySourceId("github", String(payload.repository.id))) ??
      (await Repository.findByFullNameForWebhook(payload.repository.full_name));
    if (!repo) return;

    const branch = payload.ref.replace("refs/heads/", "");
    const commitCount = payload.commits?.length ?? 0;
    const lastCommit = payload.head_commit?.message?.split("\n")[0]?.slice(0, 72) ?? "";

    log.info("push event", { repo: payload.repository.full_name, branch, commitCount });

    const pushTags = [Tags.ghRepo(repo.fullName), Tags.ghBranch(branch)];

    await Event.create({
      source: "repository",
      sourceId: repo.id,
      origin: "webhook",
      type: "github.push",
      tags: pushTags,
      data: {
        branch,
        commitCount,
        lastCommit,
        pusher: payload.pusher?.name,
      },
    });
  });
}
