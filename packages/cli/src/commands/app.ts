import type { Command } from "../lib/command";
import { log } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { parseArguments } from "../lib/args";
import { getSdk } from "../lib/sdk";

export default {
  name: "app",
  description: "Manage OAuth apps      [list|create --name X --redirect-uri Y|delete <id>]",
  handler: async (args) => {
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
  },
} satisfies Command;
