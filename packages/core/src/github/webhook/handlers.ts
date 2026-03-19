import type { GitHubWebhook } from "./index";

export function registerHandlers(webhook: typeof GitHubWebhook) {
  webhook.on("push", async ({ payload }) => {});

  webhook.on("pull_request.opened", async ({ payload }) => {});
}
