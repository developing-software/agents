import { Hono } from "hono";
import {
  handleForjeroWebhook,
  resolveAndVerifyForjeroDelivery,
} from "@agents/core/git/provider/forjero/webhook";

export namespace ForjeroApi {
  export const route = new Hono().post("/webhook", async (c) => {
    const eventName =
      c.req.header("x-forgejo-event") ?? c.req.header("x-gitea-event");
    const signature =
      c.req.header("x-forgejo-signature") ?? c.req.header("x-gitea-signature");

    if (!eventName) {
      return c.json({ ok: false, message: "Missing X-Forgejo-Event header" }, 400);
    }

    const rawBody = await c.req.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return c.json({ ok: false, message: "Invalid JSON body" }, 400);
    }

    const repoFullName = (parsed as { repository?: { full_name?: string } } | null)
      ?.repository?.full_name;

    const resolved = await resolveAndVerifyForjeroDelivery({
      rawBody,
      signature,
      repoFullName,
    });
    if (!resolved) {
      return c.json({ ok: false, message: "Unknown installation or invalid signature" }, 401);
    }

    await handleForjeroWebhook({
      installationId: resolved.installationId,
      eventName,
      payload: parsed,
    });

    return c.json({ ok: true }, 200);
  });
}
