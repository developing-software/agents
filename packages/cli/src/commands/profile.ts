import type { Command } from "../lib/command";
import { log } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { parseArguments } from "../lib/args";
import { getSdk } from "../lib/sdk";

export default {
  name: "profile",
  description: "Manage your profile  [get|update --name X --email Y]",
  handler: async (args) => {
    const sub = args[0];
    const { sdk } = await getSdk();

    if (!sub || sub === "get") {
      const { data, error } = await withSpinner("Fetching profile", () => sdk.getProfile());
      if (error) {
        log.error((error as any).message ?? "Failed to fetch profile");
        process.exit(1);
      }
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
      if (error) {
        log.error((error as any).message ?? "Failed to update profile");
        process.exit(1);
      }
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    log.error(`Unknown subcommand: profile ${sub}`);
    log.info("Usage: dev-agents profile [get|update --name X --email Y]");
    process.exit(1);
  },
} satisfies Command;
