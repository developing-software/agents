#!/usr/bin/env bun

import type { Command } from "./lib/command";
import { parseArguments } from "./lib/args";
import { log, colors } from "./lib/colors";
import { withSpinner } from "./lib/spinner";
import { DevAgentSdk } from "@agents/sdk";
import { createClient as createSdkClient } from "@agents/sdk/client";
import { createClient as createAuthClient } from "@openauthjs/openauth/client";

// -- Config --

const CONFIG_PATH = `${process.env.HOME}/.config/dev-agents/config.json`;
const API_BASE = process.env.API_URL ?? "http://localhost:5173/api";
const AUTH_ISSUER = process.env.AUTH_URL ?? "http://localhost:3002";

type Config = { token: string; baseUrl: string };

async function readConfig(): Promise<Config | null> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) return null;
  try {
    return await file.json();
  } catch {
    return null;
  }
}

async function writeConfig(config: Config): Promise<void> {
  await Bun.$`mkdir -p ${CONFIG_PATH.split("/").slice(0, -1).join("/")}`.quiet();
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function deleteConfig(): Promise<void> {
  await Bun.$`rm -f ${CONFIG_PATH}`.quiet().nothrow();
}

// -- SDK --

function makeSdk(config: Config) {
  return new DevAgentSdk({
    client: createSdkClient({ auth: () => config.token, baseUrl: config.baseUrl }),
  });
}

async function getSdk() {
  const config = await readConfig();
  if (!config) {
    log.error("Not logged in. Run: dev-agents login");
    process.exit(1);
  }
  return { sdk: makeSdk(config), config };
}

// -- Handlers --

async function handleLogin(_args: string[]) {
  const CALLBACK_PORT = 3006;
  const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

  const authClient = createAuthClient({ clientID: "cli", issuer: AUTH_ISSUER });

  const { challenge, url } = await authClient.authorize(CALLBACK_URL, "code", {
    pkce: true,
    provider: "github",
  });

  log.info(`Opening browser to authenticate...`);
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
          return new Response("<html><body>Authentication failed. You can close this tab.</body></html>", {
            headers: { "Content-Type": "text/html" },
          });
        }
        if (code) {
          resolve(code);
          return new Response("<html><body>Login successful! You can close this tab.</body></html>", {
            headers: { "Content-Type": "text/html" },
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
}

async function handleLogout(_args: string[]) {
  await deleteConfig();
  log.success("Logged out.");
}

async function handleProfile(args: string[]) {
  const sub = args[0];
  const { sdk } = await getSdk();

  if (!sub || sub === "get") {
    const { data, error } = await withSpinner("Fetching profile", () => sdk.getProfile());
    if (error) { log.error((error as any).message ?? "Failed to fetch profile"); process.exit(1); }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (sub === "update") {
    const { options } = parseArguments(args.slice(1));
    if (!options.name && !options.email) {
      log.error("Provide --name and/or --email");
      process.exit(1);
    }
    const { data, error } = await withSpinner("Updating profile", () =>
      sdk.putProfile({ name: options.name ?? "", email: options.email ?? "" }),
    );
    if (error) { log.error((error as any).message ?? "Failed to update profile"); process.exit(1); }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  log.error(`Unknown subcommand: profile ${sub}`);
  log.info("Usage: dev-agents profile [get|update --name X --email Y]");
  process.exit(1);
}

async function handleToken(args: string[]) {
  const sub = args[0];
  const { sdk } = await getSdk();

  if (!sub || sub === "list") {
    const { data, error } = await withSpinner("Fetching tokens", () => sdk.getToken());
    if (error) { log.error((error as any).message ?? "Failed to fetch tokens"); process.exit(1); }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (sub === "create") {
    const { data, error } = await withSpinner("Creating token", () => sdk.postToken());
    if (error) { log.error((error as any).message ?? "Failed to create token"); process.exit(1); }
    log.success(`Token created: ${data!.token}`);
    return;
  }

  if (sub === "delete") {
    const id = args[1];
    if (!id) { log.error("Provide token ID: dev-agents token delete <id>"); process.exit(1); }
    const { error } = await withSpinner(`Deleting token ${id}`, () => sdk.deleteTokenById({ id }));
    if (error) { log.error((error as any).message ?? "Failed to delete token"); process.exit(1); }
    log.success("Token deleted.");
    return;
  }

  log.error(`Unknown subcommand: token ${sub}`);
  log.info("Usage: dev-agents token [list|create|delete <id>]");
  process.exit(1);
}

async function handleApp(args: string[]) {
  const sub = args[0];
  const { sdk } = await getSdk();

  if (!sub || sub === "list") {
    const { data, error } = await withSpinner("Fetching apps", () => sdk.getApp());
    if (error) { log.error((error as any).message ?? "Failed to fetch apps"); process.exit(1); }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (sub === "create") {
    const { options } = parseArguments(args.slice(1));
    if (!options.name || !options["redirect-uri"]) {
      log.error("Provide --name and --redirect-uri");
      process.exit(1);
    }
    const { data, error } = await withSpinner("Creating app", () =>
      sdk.postApp({ name: options.name, redirectURI: options["redirect-uri"] }),
    );
    if (error) { log.error((error as any).message ?? "Failed to create app"); process.exit(1); }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (sub === "delete") {
    const id = args[1];
    if (!id) { log.error("Provide app ID: dev-agents app delete <id>"); process.exit(1); }
    const { error } = await withSpinner(`Deleting app ${id}`, () => sdk.deleteAppById({ id }));
    if (error) { log.error((error as any).message ?? "Failed to delete app"); process.exit(1); }
    log.success("App deleted.");
    return;
  }

  log.error(`Unknown subcommand: app ${sub}`);
  log.info("Usage: dev-agents app [list|create --name X --redirect-uri Y|delete <id>]");
  process.exit(1);
}

// -- Command registry --

const commands: Command[] = [
  { name: "login", description: "Authenticate via GitHub OAuth", handler: handleLogin },
  { name: "logout", description: "Remove stored credentials", handler: handleLogout },
  { name: "profile", description: "Manage your profile  [get|update]", handler: handleProfile },
  { name: "token", description: "Manage personal tokens [list|create|delete]", handler: handleToken },
  { name: "app", description: "Manage OAuth apps      [list|create|delete]", handler: handleApp },
];

function showHelp() {
  console.log(`\nUsage: dev-agents <command> [subcommand] [options]\n\nCommands:`);
  for (const cmd of commands) {
    console.log(`  ${colors.bold(cmd.name.padEnd(10))}  ${cmd.description}`);
  }
  console.log(`\nRun 'dev-agents <command> --help' for more information.\n`);
}

async function main() {
  const args = Bun.argv.slice(2);
  const commandName = args[0];

  if (!commandName || commandName === "--help" || commandName === "-h") {
    showHelp();
    process.exit(0);
  }

  const command = commands.find((c) => c.name === commandName);
  if (!command) {
    log.error(`Unknown command: ${commandName}`);
    showHelp();
    process.exit(1);
  }

  try {
    await command.handler(args.slice(1));
  } catch (error) {
    log.error(`${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
