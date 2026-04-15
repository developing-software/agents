import { VisibleError } from "../../error";
import type { Engine } from "./types";

export const vercelEngine: Engine = {
  id: "vercel",
  label: "Vercel Sandbox",
  async dispatch() {
    throw new VisibleError(
      "internal",
      "engine_not_implemented",
      "Vercel engine is not yet implemented",
    );
  },
};
