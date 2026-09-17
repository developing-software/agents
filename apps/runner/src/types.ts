import type { AgentEvent } from "@agents/core/events/agent";

export type AgentMetrics = AgentEvent.Completed.Metrics;
export type AgentPricing = AgentEvent.Completed.Pricing;

export interface ExtractorInputs {
  agent: string;
  /** Directory the agent wrappers write their output into (AGENTS_OUT). */
  outDir: string;
  model: string;
}

export interface ExtractorResult {
  name: string;
  sessionId: string | null;
  finalMessage: string | null;
  metrics: AgentMetrics | null;
  artifactPath: string | null;
  artifactName: string | null;
}

export const log = {
  info: (msg: string) => console.log(`▶ ${msg}`),
  warn: (msg: string) => console.error(`⚠ ${msg}`),
};
