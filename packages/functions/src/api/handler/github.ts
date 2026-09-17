import { Hono } from "hono";
import { verifyAndReceive } from "@agents/core/git/provider/github";

export namespace GitHubApi {
  export const route = new Hono().post("/webhook", async (c) => {
    const id = c.req.header("x-github-delivery");
    const name = c.req.header("x-github-event");
    const signature = c.req.header("x-hub-signature-256");

    if (!id || !name || !signature) {
      return c.json({ ok: false, message: "Missing required GitHub webhook headers" }, 400);
    }

    const rawBody = await c.req.text();
    try {
      await verifyAndReceive({ id, name, rawBody, signature });
    } catch (err) {
      console.error("github webhook failed", {
        id,
        name,
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      });
      throw err;
    }
    return c.json({ ok: true }, 200);
  });
}
