import { Hono } from "hono";
import { GitHubWebhook } from "@agents/core/github";

GitHubWebhook.init(process.env.GITHUB_WEBHOOK_SECRET ?? "dev_webhook_secret");

export namespace GitHubApi {
  export const route = new Hono().post("/webhook", async (c) => {
    const id = c.req.header("x-github-delivery");
    const name = c.req.header("x-github-event");
    const signature = c.req.header("x-hub-signature-256");

    if (!id || !name || !signature) {
      return c.json({ ok: false, message: "Missing required GitHub webhook headers" }, 400);
    }

    const rawBody = await c.req.text();
    await GitHubWebhook.verifyAndReceive({ id, name, rawBody, signature });
    return c.json({ ok: true }, 200);
  });
}
