export interface ExtractorInputs {
  agent: string;
  executionFile: string;
  sessionId: string;
  finalMessage: string;
  model: string;
  provider: string;
  status: string;
}

export interface AgentMetrics {
  tokens: {
    input: number | null;
    output: number | null;
    reasoning: number | null;
    cache_read: number | null;
    cache_creation: number | null;
  };
  turns: number | null;
  cost_usd: number | null;
  model: string | null;
}

export interface ExtractorResult {
  name: string;
  sessionId: string | null;
  finalMessage: string | null;
  metrics: AgentMetrics | null;
  artifactPath: string | null;
  artifactName: string | null;
}

export interface PricingResult {
  heuristic: "agent-reported" | "models-dev";
  model: string;
  provider: string;
  cost: Record<string, number | undefined>;
  cost_usd: number | null;
}
