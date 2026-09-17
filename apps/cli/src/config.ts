import { rm } from "node:fs/promises";
import { createClient } from "@openauthjs/openauth/client";

export type Config = {
  /** A manually-pasted personal access token. */
  token?: string;
  /** OAuth tokens from `login`. */
  access?: string;
  refresh?: string;
  issuer?: string;
  url?: string;
};

export const CLIENT_ID = "cli";
export const DEFAULT_URL = "https://api.agents.developing.company/api";
export const DEFAULT_ISSUER = "https://auth.agents.developing.company";

const dir = `${process.env.XDG_CONFIG_HOME ?? `${process.env.HOME}/.config`}/dev-agents`;
const file = `${dir}/config.json`;

async function read(): Promise<Config> {
  const f = Bun.file(file);
  if (await f.exists()) return f.json().catch(() => ({}));
  return {};
}

export async function write(cfg: Config) {
  await Bun.write(file, JSON.stringify(cfg, null, 2));
}

export async function clear() {
  if (await Bun.file(file).exists()) await rm(file);
}

/**
 * Bearer for API calls: `--token` flag › `AGENTS_TOKEN` env › a saved personal token
 * › the saved OAuth access token, refreshed if a refresh token is on file.
 */
export async function token(flag?: string) {
  if (flag) return flag;
  if (process.env.AGENTS_TOKEN) return process.env.AGENTS_TOKEN;

  const cfg = await read();
  if (cfg.token) return cfg.token;
  if (!cfg.access) return undefined;
  if (!cfg.refresh || !cfg.issuer) return cfg.access;

  const next = await createClient({ clientID: CLIENT_ID, issuer: cfg.issuer }).refresh(
    cfg.refresh,
    { access: cfg.access },
  );
  if (next.err || !next.tokens) return cfg.access;
  await write({ ...cfg, access: next.tokens.access, refresh: next.tokens.refresh });
  return next.tokens.access;
}

/** Base URL: `--url` flag › `API_URL` env › saved config › production. */
export async function url(flag?: string) {
  return flag ?? process.env.API_URL ?? (await read()).url ?? DEFAULT_URL;
}

/** Issuer URL: `--issuer` flag › `AUTH_URL` env › saved config › production. */
export async function issuer(flag?: string) {
  return flag ?? process.env.AUTH_URL ?? (await read()).issuer ?? DEFAULT_ISSUER;
}
