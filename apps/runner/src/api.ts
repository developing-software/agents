import { readFileSync } from "fs";
import { DevAgentSdk } from "@agents/sdk";
import { createClient, createConfig } from "@agents/sdk/client";
import { resolveModel } from "@agents/core/events/agent/resolve";
import { log, type AgentMetrics, type AgentPricing } from "./types";

export interface RunnerEnv {
  apiUrl: string;
  token: string;
  eventId: string;
}

export function readEnv(): RunnerEnv | null {
  const apiUrl = process.env.AGENTS_API_URL;
  const token = process.env.AGENTS_API_TOKEN;
  const eventId = process.env.AGENTS_EVENT_ID;
  if (!apiUrl || !token || !eventId) return null;
  return { apiUrl, token, eventId };
}

export function createApi(env: RunnerEnv): DevAgentSdk {
  return new DevAgentSdk({
    client: createClient(
      createConfig({
        baseUrl: env.apiUrl,
        headers: { Authorization: `Bearer ${env.token}` },
      }),
    ),
  });
}

export async function enrichWithPricing(
  sdk: DevAgentSdk,
  metrics: AgentMetrics | null,
): Promise<AgentPricing | null> {
  if (!metrics?.model) return null;

  const resolved = resolveModel(metrics.model);
  try {
    const { data, error } = await sdk.postModelsCost({
      model: resolved.model,
      provider: resolved.provider || undefined,
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
    log.warn(`Failed to fetch pricing: ${err}`);
    return null;
  }
}

export async function uploadArtifact(env: RunnerEnv, path: string, name: string): Promise<void> {
  const contentType = path.endsWith(".json") ? "application/json" : "text/plain";
  try {
    const form = new FormData();
    form.append("name", name);
    form.append("file", new Blob([readFileSync(path)], { type: contentType }), name);

    const res = await fetch(`${env.apiUrl}/events/${env.eventId}/artifacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      log.warn(`Failed to upload ${name}: HTTP ${res.status}`);
    }
  } catch (err) {
    log.warn(`Artifact upload failed: ${err}`);
  }
}
