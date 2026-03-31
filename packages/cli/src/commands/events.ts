import { createClient, createConfig } from "@agents/sdk/client";
import { DevAgentSdk } from "@agents/sdk";
import type { Command } from "../lib/command";
import { log } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { getSdk } from "../lib/sdk";
import { parseArguments } from "../lib/args";
import { API_BASE } from "../lib/config";

function makeSdkFromToken(token: string, url: string) {
  return new DevAgentSdk({
    client: createClient(
      createConfig({ baseUrl: url, headers: { Authorization: `Bearer ${token}` } }),
    ),
  });
}

export default {
  name: "events",
  description: "Emit an event [emit]",
  handler: async (args) => {
    const sub = args[0];

    if (!sub || sub === "emit") {
      const parsed = parseArguments(args.slice(sub === "emit" ? 1 : 0));
      const type = parsed.options["type"];
      const repo = parsed.options["repo"];
      const parentEventId = parsed.options["parent-event-id"];
      const data = parsed.options["data"];
      const tags = parsed.options["tags"]
        ?.split(/[\n,]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const token = parsed.options["token"];
      const url = parsed.options["url"] ?? API_BASE;

      if (!type) {
        log.error("Missing required option: --type");
        log.info(
          "Usage: dev-agents events emit --type <type> [--repo <owner/repo>] [--parent-event-id <id>] [--data <json>] [--tags <tags>] [--token <token>] [--url <url>]",
        );
        process.exit(1);
      }

      const sdk = token ? makeSdkFromToken(token, url) : (await getSdk()).sdk;

      const parsedData = data
        ? (() => {
            const d = JSON.parse(data);
            if (!d || typeof d !== "object" || Array.isArray(d))
              throw new Error("--data must be a JSON object");
            return d as Record<string, unknown>;
          })()
        : undefined;

      const { data: event, error } = await withSpinner(`Emitting event "${type}"`, () =>
        sdk.postEvents({
          eventIngestInput: {
            repoFullName: repo,
            parentEventId: parentEventId ?? undefined,
            origin: "cli",
            type,
            tags,
            data: parsedData,
          },
        }),
      );

      if (error) {
        log.error((error as any).message ?? "Failed to emit event");
        process.exit(1);
      }

      log.success(`Event created: ${event!.id}`);
      return;
    }

    log.error(`Unknown subcommand: events ${sub}`);
    log.info("Usage: dev-agents events emit --type <type>");
    process.exit(1);
  },
} satisfies Command;
