#!/usr/bin/env bun

import { api } from "./api";
import { artifacts } from "./artifacts";
import { login, logout } from "./auth";
import { events } from "./events";
import { health } from "./health";
import { serve } from "./serve";

const help = `dev-agents — run and talk to the Agents API

Usage:
  dev-agents api [method] [args]                Call any endpoint via the generated SDK
  dev-agents events emit --type --repo [...]    Emit an event
  dev-agents artifacts upload --event-id --path Upload a file or directory of artifacts
  dev-agents login [--provider --issuer --url]  Log in via browser (PKCE) and save tokens
  dev-agents logout                             Forget the saved tokens
  dev-agents serve <api|auth|console>           Serve a surface
  dev-agents health <target> [--probe]          Probe it: ready (default), live or start

Env: API_URL, AUTH_URL, AGENTS_TOKEN, API_PORT, AUTH_PORT, PORT, DATABASE_URL, AUTH_PERSIST`;

const commands: Record<string, (rest: string[]) => unknown> = {
  api,
  events,
  artifacts,
  login,
  logout,
  serve,
  health,
};

const [cmd, ...rest] = process.argv.slice(2);
const run = commands[cmd ?? ""];
if (!run) {
  console.log(help);
  process.exit(cmd && cmd !== "--help" && cmd !== "-h" ? 1 : 0);
}
await run(rest);
