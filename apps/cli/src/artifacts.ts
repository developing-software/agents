import { basename, join } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { value } from "./args";
import * as config from "./config";

const usage =
  "Usage: dev-agents artifacts upload --event-id <id> --path <file|dir> [--name <name>] [--token <token>] [--url <url>]";

/** Multipart upload — the generated SDK has no file support, so this goes through fetch. */
async function upload(file: string, name: string, event: string, token: string, url: string) {
  const form = new FormData();
  form.append("name", name);
  form.append("file", Bun.file(file), name);

  const res = await fetch(`${url}/events/${event}/artifacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} — ${await res.text().catch(() => "")}`);
  console.log(`Uploaded ${name}`);
}

export async function artifacts(rest: string[]) {
  const [sub, ...raw] = rest;
  const event = value(raw, "--event-id");
  const path = value(raw, "--path");
  if (sub !== "upload" || !event || !path) {
    console.error(usage);
    process.exit(1);
  }

  const token = await config.token(value(raw, "--token"));
  if (!token) {
    console.error("Not logged in. Run `dev-agents login` or pass --token.");
    process.exit(1);
  }
  const url = await config.url(value(raw, "--url"));

  const info = await stat(path).catch(() => null);
  if (!info) {
    console.error(`Path not found: ${path}`);
    process.exit(1);
  }

  if (!info.isDirectory()) {
    await upload(path, value(raw, "--name") ?? basename(path), event, token, url);
    return;
  }
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isFile())) {
    await upload(join(path, entry.name), entry.name, event, token, url);
  }
}
