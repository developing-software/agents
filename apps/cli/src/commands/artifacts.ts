import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import type { Command } from "../lib/command";
import { log } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { parseArguments } from "../lib/args";
import { API_BASE } from "../lib/config";

async function uploadFile(
  filePath: string,
  name: string,
  eventId: string,
  token: string,
  url: string,
): Promise<void> {
  const contentType = filePath.endsWith(".json") ? "application/json" : "text/plain";
  const form = new FormData();
  form.append("name", name);
  form.append("file", new Blob([readFileSync(filePath)], { type: contentType }), name);

  const res = await fetch(`${url}/events/${eventId}/artifacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    throw new Error(`HTTP ${res.status} — ${text}`);
  }
}

export default {
  name: "artifacts",
  description: "Upload an artifact [upload]",
  handler: async (args) => {
    const sub = args[0];

    if (!sub || sub === "upload") {
      const parsed = parseArguments(args.slice(sub === "upload" ? 1 : 0));
      const eventId = parsed.options["event-id"];
      const path = parsed.options["path"];
      const nameOverride = parsed.options["name"];
      const token = parsed.options["token"];
      const url = parsed.options["url"] ?? API_BASE;

      if (!eventId) {
        log.error("Missing required option: --event-id");
        log.info(
          "Usage: dev-agents artifacts upload --event-id <id> --path <path> [--name <name>] --token <token> [--url <url>]",
        );
        process.exit(1);
      }
      if (!path) {
        log.error("Missing required option: --path");
        log.info(
          "Usage: dev-agents artifacts upload --event-id <id> --path <path> [--name <name>] --token <token> [--url <url>]",
        );
        process.exit(1);
      }
      if (!token) {
        log.error("Missing required option: --token");
        log.info(
          "Usage: dev-agents artifacts upload --event-id <id> --path <path> [--name <name>] --token <token> [--url <url>]",
        );
        process.exit(1);
      }

      if (!existsSync(path)) {
        log.error(`Path not found: ${path}`);
        process.exit(1);
      }

      const stat = statSync(path);

      if (stat.isDirectory()) {
        const files = readdirSync(path).filter((f) => statSync(join(path, f)).isFile());
        for (const entry of files) {
          const filePath = join(path, entry);
          await withSpinner(`Uploading ${entry}`, () =>
            uploadFile(filePath, entry, eventId, token, url),
          );
          log.success(`Uploaded ${entry}`);
        }
      } else {
        const name = nameOverride || basename(path);
        await withSpinner(`Uploading ${name}`, () => uploadFile(path, name, eventId, token, url));
        log.success(`Uploaded ${name}`);
      }

      return;
    }

    log.error(`Unknown subcommand: artifacts ${sub}`);
    log.info("Usage: dev-agents artifacts upload --event-id <id> --path <path> --token <token>");
    process.exit(1);
  },
} satisfies Command;
