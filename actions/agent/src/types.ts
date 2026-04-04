import type { AgentEvent } from "@agents/core/events/agent";

export type AgentMetrics = AgentEvent.Completed.Metrics;
export type AgentPricing = AgentEvent.Completed.Pricing;

export interface ExtractorInputs {
  agent: string;
  executionFile: string;
  sessionId: string;
  finalMessage: string;
  model: string;
  provider: string;
  status: string;
}

export interface ExtractorResult {
  name: string;
  sessionId: string | null;
  finalMessage: string | null;
  metrics: AgentMetrics | null;
  artifactPath: string | null;
  artifactName: string | null;
}
