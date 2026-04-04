import type { GitHubWebhook } from "./index";
import { GithubInstallation } from "../installation/index";
import { User } from "../../user/index";
import { Log } from "../../util/log";
import { Event } from "../../events/index";
import { Tags } from "../../tag";
import { Repository } from "../../repository/index";

const log = Log.create({ namespace: "github.webhook" });

export function registerHandlers(webhook: typeof GitHubWebhook) {
  // App install / uninstall
  webhook.on("installation.created", async ({ payload }) => {
    const account = payload.installation.account;
    const owner = account && "login" in account ? account.login : "";
    log.info("installation created", { installationId: payload.installation.id, owner });
    const users = await User.fromUsername(payload.sender.login);
    const userId = users[0]?.id;
    const connectionId = await GithubInstallation.upsert({
      userId,
      installationId: payload.installation.id,
      owner,
    });
    for (const r of payload.repositories ?? []) {
      await Repository.upsert({
        userId,
        source: "github",
        sourceId: String(r.id),
        connectionId,
        owner,
        repo: r.name,
        fullName: r.full_name,
      });
    }
  });

  webhook.on("installation.deleted", async ({ payload }) => {
    log.info("installation deleted", { installationId: payload.installation.id });
    const installation = await GithubInstallation.remove(payload.installation.id);
    if (!installation) return;
    await Repository.removeByConnectionId(installation.id);
  });

  webhook.on("installation_repositories.added", async ({ payload }) => {
    const account = payload.installation.account;
    const owner = account && "login" in account ? account.login : "";
    log.info("repositories added", {
      installationId: payload.installation.id,
      count: payload.repositories_added.length,
    });
    const users = await User.fromUsername(payload.sender.login);
    const userId = users[0]?.id;
    const connectionId = await GithubInstallation.upsert({
      userId,
      installationId: payload.installation.id,
      owner,
    });
    for (const r of payload.repositories_added) {
      await Repository.upsert({
        userId,
        source: "github",
        sourceId: String(r.id),
        connectionId,
        owner,
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

  // Issues
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
        ? await Event.findParent({ source: "repository", sourceId: repo.id, tags: issueTags })
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

  // Pull requests
  webhook.on("pull_request", async ({ payload }) => {
    const installationId = "installation" in payload ? payload.installation?.id : undefined;
    const repo =
      (await Repository.findBySourceId("github", String(payload.repository.id))) ??
      (await Repository.findByFullNameForWebhook(payload.repository.full_name));

    log.info("pull_request event", {
      action: payload.action,
      repo: payload.repository.full_name,
      number: payload.pull_request.number,
      installationId,
    });

    if (!repo) return;

    const prTags = [
      Tags.ghRepo(repo.fullName),
      Tags.ghPr(payload.pull_request.number),
      Tags.ghBranch(payload.pull_request.head.ref),
    ];
    const parentEventId =
      payload.action !== "opened"
        ? await Event.findParent({ source: "repository", sourceId: repo.id, tags: prTags })
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

  // Push
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

    const parentEventId = await Event.findParent({
      source: "repository",
      sourceId: repo.id,
      tags: [Tags.ghRepo(repo.fullName), Tags.ghBranch(branch)],
    });

    await Event.create({
      source: "repository",
      sourceId: repo.id,
      origin: "webhook",
      type: "github.push",
      tags: pushTags,
      parentEventId,
      data: {
        branch,
        commitCount,
        lastCommit,
        pusher: payload.pusher?.name,
      },
    });
  });
}
