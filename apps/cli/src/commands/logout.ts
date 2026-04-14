import type { Command } from "../lib/command";
import { log } from "../lib/colors";
import { deleteConfig } from "../lib/config";

export default {
  name: "logout",
  description: "Remove stored credentials",
  handler: async (_args) => {
    await deleteConfig();
    log.success("Logged out.");
  },
} satisfies Command;
