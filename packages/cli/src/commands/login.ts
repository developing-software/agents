import type { Command } from "../lib/command";
import { log, colors } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { writeConfig, API_BASE, AUTH_ISSUER } from "../lib/config";
import { makeSdk } from "../lib/sdk";
import { createClient as createAuthClient } from "@openauthjs/openauth/client";

const CALLBACK_PORT = 3006;
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

export default {
  name: "login",
  description: "Authenticate via GitHub OAuth",
  handler: async (_args) => {
    const authClient = createAuthClient({ clientID: "cli", issuer: AUTH_ISSUER });

    const { challenge, url } = await authClient.authorize(CALLBACK_URL, "code", {
      pkce: true,
      provider: "github",
    });

    log.info("Opening browser to authenticate...");
    log.info(colors.dim(url));

    const opener =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    await Bun.$`${opener} ${url}`.quiet().nothrow();

    const code = await new Promise<string>((resolve, reject) => {
      const server = Bun.serve({
        port: CALLBACK_PORT,
        fetch(req) {
          const u = new URL(req.url);
          if (u.pathname !== "/callback") return new Response("Not found", { status: 404 });

          const code = u.searchParams.get("code");
          const error = u.searchParams.get("error");

          setTimeout(() => server.stop(), 100);

          if (error) {
            reject(new Error(u.searchParams.get("error_description") ?? error));
            return new Response(
              "<html><body>Authentication failed. You can close this tab.</body></html>",
              {
                headers: { "Content-Type": "text/html" },
              },
            );
          }
          if (code) {
            resolve(code);
            return new Response(
              "<html><body>Login successful! You can close this tab.</body></html>",
              {
                headers: { "Content-Type": "text/html" },
              },
            );
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

    const exchanged = await withSpinner("Exchanging code for token", async () => {
      const result = await authClient.exchange(code, CALLBACK_URL, challenge.verifier);
      if (result.err) throw new Error("Failed to exchange authorization code");
      return result;
    });

    const { data, error } = await withSpinner("Creating personal access token", async () => {
      const tempSdk = makeSdk({ token: exchanged.tokens.access, baseUrl: API_BASE });
      return tempSdk.postToken();
    });

    if (error || !data) {
      log.error(`Failed to create token: ${(error as any)?.message ?? "unknown error"}`);
      process.exit(1);
    }

    await writeConfig({ token: data.token, baseUrl: API_BASE });
    log.success("Logged in successfully!");
  },
} satisfies Command;
