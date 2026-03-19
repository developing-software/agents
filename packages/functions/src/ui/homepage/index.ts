import type { Context } from "hono";
import { getRuntimeKey } from "hono/adapter";
import { healthcheck } from "@agents/core/drizzle/index";
import { Actor } from "@agents/core/actor";
import { User } from "@agents/core/user/index";

export const Homepage = async (c: Context) => {
  const runtime = getRuntimeKey();
  const dbCheck = await healthcheck();
  const statusColor = dbCheck.status === "ok" ? "green" : "red";

  const actor = Actor.use();
  let userHtml = `<p>Status: <strong>Not logged in</strong></p>
    <p><a href="/login">Login Page</a></p>`;

  if (actor.type !== "public" && "userID" in actor.properties) {
    const user = await User.fromID(actor.properties.userID);
    if (user) {
      userHtml = `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 8px 0;">
        <p style="margin: 0 0 4px;"><strong>Name:</strong> ${escapeHtml(user.name ?? "—")}</p>
        <p style="margin: 0 0 4px;"><strong>Email:</strong> ${escapeHtml(user.email ?? "—")}</p>
        <p style="margin: 0 0 4px;"><strong>User ID:</strong> <code>${escapeHtml(user.id)}</code></p>
        <p style="margin: 0;"><strong>Actor type:</strong> ${escapeHtml(actor.type)}</p>
      </div>`;
    } else {
      userHtml = `<p style="color: orange;">Logged in as <code>${escapeHtml(actor.properties.userID)}</code>, but user record not found.</p>`;
    }
  }

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Home</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #1e293b; }
      h1 { margin-bottom: 0.25em; }
      h2 { margin-top: 1.5em; margin-bottom: 0.5em; color: #334155; }
      a { color: #2563eb; }
      code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
      .links { display: flex; gap: 16px; flex-wrap: wrap; }
      .links a { padding: 8px 14px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9em; }
      .links a:hover { background: #1d4ed8; }
    </style>
  </head>
  <body>
    <h1>Welcome to the API</h1>
    <p>Runtime: <code>${runtime}</code> · DB: <span style="color: ${statusColor}; font-weight: 600;">${dbCheck.status}</span> — ${escapeHtml(dbCheck.message)}</p>

    <h2>Current User</h2>
    ${userHtml}

    <h2>Links</h2>
    <div class="links">
      <a href="/openapi">OpenAPI Docs</a>
      <a href="/openapi.json">openapi.json</a>
      <a href="/healthz">Health Check</a>
      ${actor.type !== "public" ? '<a href="/logout">Logout</a>' : '<a href="/login">Login</a>'}
    </div>
  </body>
</html>`;

  return c.html(html);
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
