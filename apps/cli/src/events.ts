import { value } from "./args";
import { output, resolve } from "./api";

const usage =
  "Usage: dev-agents events emit --type <type> --repo <owner/repo> [--parent-event-id <id>] [--data <json>] [--tags <a,b>] [--token <token>] [--url <url>]";

export async function events(rest: string[]) {
  const [sub, ...raw] = rest;
  if (sub !== "emit") {
    console.error(usage);
    process.exit(1);
  }

  const type = value(raw, "--type");
  const repo = value(raw, "--repo");
  if (!type || !repo) {
    console.error(usage);
    process.exit(1);
  }

  const data = value(raw, "--data");
  const parsed = data ? (JSON.parse(data) as unknown) : undefined;
  if (parsed !== undefined && (!parsed || typeof parsed !== "object" || Array.isArray(parsed))) {
    console.error("--data must be a JSON object");
    process.exit(1);
  }
  const tags = value(raw, "--tags")
    ?.split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const client = await resolve(raw);
  const res = await client.postEvents({
    eventIngestInput: {
      repoFullName: repo,
      parentEventId: value(raw, "--parent-event-id"),
      origin: "cli",
      type,
      tags,
      data: parsed as Record<string, unknown> | undefined,
    },
  });
  output(res);
}
