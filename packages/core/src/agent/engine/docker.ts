import { VisibleError } from "../../error";
import type { Engine } from "./types";

export const dockerEngine: Engine = {
  id: "docker",
  label: "Docker",
  async dispatch() {
    throw new VisibleError(
      "internal",
      "engine_not_implemented",
      "Docker engine is not yet implemented",
    );
  },
};
