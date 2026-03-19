import type { GitHubWebhook } from "./index";
import { GithubRepo } from "../repo/index";
import { GithubIssue } from "../repo/issue";
import { GithubPullRequest } from "../repo/pull_request";
import { Log } from "../../util/log";

const log = Log.create({ namespace: "github.webhook" });

export function registerHandlers(webhook: typeof GitHubWebhook) {
  // App install / uninstall
  webhook.on("installation.created", async ({ payload }) => {
    const account = payload.installation.account;
    const owner = account && "login" in account ? account.login : "";
    log.info("installation created", { installationId: payload.installation.id, owner });
    for (const r of payload.repositories ?? []) {
      await GithubRepo.upsert({ installationId: payload.installation.id, owner, repo: r.name, fullName: r.full_name });
    }
  });

  webhook.on("installation.deleted", async ({ payload }) => {
    log.info("installation deleted", { installationId: payload.installation.id });
    await GithubRepo.remove(payload.installation.id);
  });

  webhook.on("installation_repositories.added", async ({ payload }) => {
    const account = payload.installation.account;
    const owner = account && "login" in account ? account.login : "";
    log.info("repositories added", { installationId: payload.installation.id, count: payload.repositories_added.length });
    for (const r of payload.repositories_added) {
      await GithubRepo.upsert({ installationId: payload.installation.id, owner, repo: r.name, fullName: r.full_name });
    }
  });

  webhook.on("installation_repositories.removed", async ({ payload }) => {
    log.info("repositories removed", { installationId: payload.installation.id, count: payload.repositories_removed.length });
    for (const r of payload.repositories_removed) {
      await GithubRepo.removeByFullName(r.full_name);
    }
  });

  // Issues
  webhook.on("issues", async ({ payload }) => {
    log.info("issue event", { action: payload.action, repo: payload.repository.full_name, number: payload.issue.number });
    const repo = await GithubRepo.findByFullName(payload.repository.full_name);
    if (!repo) return;
    await GithubIssue.upsert({
      repoId: repo.id,
      number: payload.issue.number,
      title: payload.issue.title,
      state: payload.issue.state ?? "",
      labels: (payload.issue.labels ?? []).map((l) => (l && typeof l === "object" ? (l.name ?? "") : String(l))),
      body: payload.issue.body ?? undefined,
    });
  });

  // Pull requests
  webhook.on("pull_request", async ({ payload }) => {
    log.info("pull_request event", { action: payload.action, repo: payload.repository.full_name, number: payload.pull_request.number });
    const repo = await GithubRepo.findByFullName(payload.repository.full_name);
    if (!repo) return;
    await GithubPullRequest.upsert({
      repoId: repo.id,
      number: payload.pull_request.number,
      title: payload.pull_request.title,
      state: payload.pull_request.merged ? "merged" : payload.pull_request.state,
      headBranch: payload.pull_request.head.ref,
      baseBranch: payload.pull_request.base.ref,
    });
  });
}
