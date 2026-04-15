import type { Repository } from "../../repository/index";
import type { AgentWorkflow } from "../workflow";

export const EngineIds = ["github", "vercel", "cloudflare", "docker"] as const;
export type EngineId = (typeof EngineIds)[number];

export interface EngineDispatchContext {
  repository: Repository.Info;
  agent: AgentWorkflow.Agent;
  prompt: string;
  tags: string[];
  model?: string;
  branch?: string;
  ref?: string;
}

export interface Engine {
  id: EngineId;
  label: string;
  /** Trigger agent execution on this engine. */
  dispatch(ctx: EngineDispatchContext): Promise<void>;
}
