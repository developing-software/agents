import * as core from "@actions/core";
import { createApiClient } from "@agents/actions-core";
import type { AgentMetrics, AgentPricing } from "./types";

export async function enrichWithPricing(
  metrics: AgentMetrics | null,
  provider?: string,
): Promise<AgentPricing | null> {
  if (!metrics?.model) return null;

  const token = process.env.DEV_AGENTS_TOKEN;
  if (!token) return null;

  const apiUrl = process.env.DEV_AGENTS_API_URL || "https://api.agents.developing.company/api";

  try {
    const sdk = createApiClient(token, apiUrl);
    const { data, error } = await sdk.postModelsCost({
      model: metrics.model,
      provider: provider || undefined,
      tokens: {
        input: metrics.tokens.input ?? 0,
        output: metrics.tokens.output ?? 0,
        cacheRead: metrics.tokens.cache_read ?? 0,
        cacheWrite: metrics.tokens.cache_creation ?? 0,
        reasoning: metrics.tokens.reasoning ?? 0,
      },
    });

    if (error || !data?.pricing) return null;

    return {
      heuristic: metrics.cost_usd != null ? "agent-reported" : "models-dev",
      model: data.pricing.model,
      provider: data.pricing.provider,
      cost: data.pricing.cost,
      cost_usd: metrics.cost_usd ?? data.cost_usd,
    };
  } catch (err) {
    core.warning(`Failed to fetch pricing: ${err}`);
    return null;
  }
}
