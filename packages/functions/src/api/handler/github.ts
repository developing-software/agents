import { Hono } from "hono";
import { GitHubWebhook } from "@agents/core/github";
import { ErrorCodes, VisibleError } from "@agents/core/error";

GitHubWebhook.init(process.env.GITHUB_WEBHOOK_SECRET ?? "dev_webhook_secret");
// Register webhook event handlers here, e.g.:
// GitHubWebhook.on("push", async ({ payload }) => { ... });

export namespace GitHubApi {
  export const route = new Hono().post("/webhook", async (c) => {
    const id = c.req.header("x-github-delivery");
    const name = c.req.header("x-github-event");
    const signature = c.req.header("x-hub-signature-256");

    if (!id || !name || !signature) {
      throw new VisibleError(
        "validation",
        ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
        "Missing required GitHub webhook headers",
      );
    }

    const rawBody = await c.req.text();

    await GitHubWebhook.verifyAndReceive({ id, name, rawBody, signature });

    return c.json({ ok: true }, 200);
  });
}
