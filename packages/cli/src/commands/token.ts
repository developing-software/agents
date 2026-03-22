import type { Command } from "../lib/command";
import { log } from "../lib/colors";
import { withSpinner } from "../lib/spinner";
import { getSdk } from "../lib/sdk";

export default {
  name: "token",
  description: "Manage personal tokens [list|create|delete <id>]",
  handler: async (args) => {
    const sub = args[0];
    const { sdk } = await getSdk();

    if (!sub || sub === "list") {
      const { data, error } = await withSpinner("Fetching tokens", () => sdk.getToken());
      if (error) {
        log.error((error as any).message ?? "Failed to fetch tokens");
        process.exit(1);
      }
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    if (sub === "create") {
      const { data, error } = await withSpinner("Creating token", () => sdk.postToken());
      if (error) {
        log.error((error as any).message ?? "Failed to create token");
        process.exit(1);
      }
      log.success(`Token created: ${data!.token}`);
      return;
    }

    if (sub === "delete") {
      const id = args[1];
      if (!id) {
        log.error("Provide token ID: dev-agents token delete <id>");
        process.exit(1);
      }
      const { error } = await withSpinner(`Deleting token ${id}`, () =>
        sdk.deleteTokenById({ id }),
      );
      if (error) {
        log.error((error as any).message ?? "Failed to delete token");
        process.exit(1);
      }
      log.success("Token deleted.");
      return;
    }

    log.error(`Unknown subcommand: token ${sub}`);
    log.info("Usage: dev-agents token [list|create|delete <id>]");
    process.exit(1);
  },
} satisfies Command;
