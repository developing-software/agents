import type { Command } from "../lib/command";
import { log, colors } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { writeConfig, API_BASE, AUTH_ISSUER } from "../lib/config";
import { createClient as createAuthClient } from "@openauthjs/openauth/client";

const CALLBACK_PORT = 3006;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

async function openUrl(url: string) {
  const opener =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  await Bun.$`${opener} ${url}`.quiet().nothrow();
}

function callbackPage(opts: { success: boolean; title: string; message: string }) {
  const { success, title, message } = opts;
  const color = success ? "#22c55e" : "#ef4444";
  const icon = success ? "✓" : "✗";
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      text-align: center;
      padding: 48px 64px;
      border: 1px solid #262626;
      border-radius: 12px;
      background: #111;
      max-width: 400px;
    }
    .icon {
      font-size: 48px;
      color: ${color};
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 14px; color: #737373; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

export default {
  name: "login",
  description: "Authenticate via GitHub OAuth",
  handler: async (_args) => {
    const authClient = createAuthClient({ clientID: "api", issuer: AUTH_ISSUER });

    const { challenge, url } = await authClient.authorize(CALLBACK_URL, "code", {
      pkce: true,
      provider: "github",
    });

    log.info("Opening browser to authenticate...");
    log.info(colors.dim(url));
    await openUrl(url);

    const code = await new Promise<string>((resolve, reject) => {
      const server = Bun.serve({
        port: CALLBACK_PORT,
        fetch(req) {
          const u = new URL(req.url);
          if (u.pathname !== "/callback") return new Response("Not found", { status: 404 });

          const code = u.searchParams.get("code");
          const error = u.searchParams.get("error");

          setTimeout(() => server.stop(), 1000);

          if (error) {
            reject(new Error(u.searchParams.get("error_description") ?? error));
            return callbackPage({
              success: false,
              title: "Authentication failed",
              message: u.searchParams.get("error_description") ?? error,
            });
          }
          if (code) {
            resolve(code);
            return callbackPage({
              success: true,
              title: "Login successful",
              message: "You're now authenticated. You can close this tab.",
            });
          }
          reject(new Error("No code received"));
          return new Response("Unexpected request", { status: 400 });
        },
      });

      setTimeout(() => {
        server.stop();
        reject(new Error("Login timed out after 2 minutes"));
      }, 120_000);
    });

    const { tokens } = await withSpinner("Exchanging code for token", async () => {
      const result = await authClient.exchange(code, CALLBACK_URL, challenge.verifier);
      if (result.err) throw new Error("Failed to exchange authorization code");
      return result;
    });

    await writeConfig({ access: tokens.access, refresh: tokens.refresh, baseUrl: API_BASE });
    log.success("Logged in successfully!");
    process.exit(0);
  },
} satisfies Command;
