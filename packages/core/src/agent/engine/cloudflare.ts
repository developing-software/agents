import { VisibleError } from "../../error";
import type { Engine } from "./types";

export const cloudflareEngine: Engine = {
  id: "cloudflare",
  label: "Cloudflare Sandbox",
  async dispatch() {
    throw new VisibleError(
      "internal",
      "engine_not_implemented",
      "Cloudflare engine is not yet implemented",
    );
  },
};
