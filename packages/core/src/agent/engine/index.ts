import { VisibleError } from "../../error";
import { cloudflareEngine } from "./cloudflare";
import { dockerEngine } from "./docker";
import { githubEngine } from "./github";
import { EngineIds } from "./types";
import type { Engine, EngineDispatchContext, EngineId } from "./types";
import { vercelEngine } from "./vercel";

export namespace AgentEngine {
  export const Ids = EngineIds;
  export type Id = EngineId;
  export type Info = Engine;
  export type DispatchContext = EngineDispatchContext;

  const engines: Record<EngineId, Engine> = {
    github: githubEngine,
    vercel: vercelEngine,
    cloudflare: cloudflareEngine,
    docker: dockerEngine,
  };

  /** Resolve an engine by ID. Throws if the ID is unknown. */
  export function resolve(id: EngineId): Engine {
    const engine = engines[id];
    if (!engine) {
      throw new VisibleError("validation", "invalid_parameter", `Unknown engine: ${id}`, "engine");
    }
    return engine;
  }

  /** List all registered engines. */
  export function list(): Engine[] {
    return Object.values(engines);
  }
}
