import type { GitHubWebhook } from "./index";
import { GithubRepo } from "../repo/index";
import { GithubEvent } from "../event/index";
import { User } from "../../user/index";
import { Log } from "../../util/log";

const log = Log.create({ namespace: "github.webhook" });

export function registerHandlers(webhook: typeof GitHubWebhook) {
  // App install / uninstall
  webhook.on("installation.created", async ({ payload }) => {
    const account = payload.installation.account;
    const owner = account && "login" in account ? account.login : "";
    log.info("installation created", { installationId: payload.installation.id, owner });
    const users = await User.fromUsername(payload.sender.login);
    const userId = users[0]?.id;
    for (const r of payload.repositories ?? []) {
      await GithubRepo.upsert({
        userId,
        installationId: payload.installation.id,
        owner,
        repo: r.name,
        fullName: r.full_name,
      });
    }
  });

  webhook.on("installation.deleted", async ({ payload }) => {
    log.info("installation deleted", { installationId: payload.installation.id });
    await GithubRepo.remove(payload.installation.id);
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
    for (const r of payload.repositories_added) {
      await GithubRepo.upsert({
        userId,
        installationId: payload.installation.id,
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
      await GithubRepo.removeByFullName(r.full_name);
    }
  });

  // Issues
  webhook.on("issues", async ({ payload }) => {
    log.info("issue event", {
      action: payload.action,
      repo: payload.repository.full_name,
      number: payload.issue.number,
    });
    const installationId = payload.installation?.id;
    if (!installationId) return;
    const repo = await GithubRepo.findByInstallationId(installationId);
    if (!repo) return;
    await GithubEvent.create({
      repoId: repo.id,
      issueNumber: payload.issue.number,
      source: "webhook",
      type: `issues.${payload.action}`,
      payload: {
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
    // @ts-expect-error idk why
    let installationId = payload.installation?.id;
    if (!installationId) {
      const grepo = await GithubRepo.findByFullName(payload.repository.full_name).catch(() => null);
      installationId = grepo?.installationId;
      if (!installationId) {
        log.info("pull_request event with no installationId", {
          action: payload.action,
          repo: payload.repository.full_name,
          number: payload.pull_request.number,
          installationId,
        });
      }
    }

    log.info("pull_request event", {
      action: payload.action,
      repo: payload.repository.full_name,
      number: payload.pull_request.number,
      installationId: installationId,
    });

    const repo = await GithubRepo.findByInstallationId(installationId);
    if (!repo) return;
    await GithubEvent.create({
      repoId: repo.id,
      pullRequestNumber: payload.pull_request.number,
      source: "webhook",
      type: `pull_request.${payload.action}`,
      payload: {
        title: payload.pull_request.title,
        state: payload.pull_request.merged ? "merged" : payload.pull_request.state,
        headBranch: payload.pull_request.head.ref,
        baseBranch: payload.pull_request.base.ref,
      },
    });
  });
}
