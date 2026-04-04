import { z } from "zod";
import { withCache } from "../cache/with";

const API_URL = "https://models.dev/api.json";
const TTL = 21600; // 6 hours

export namespace Models {
  export const Cost = z
    .object({
      input: z.number().optional().meta({ description: "Input cost per 1M tokens (USD)", example: 3 }),
      output: z.number().optional().meta({ description: "Output cost per 1M tokens (USD)", example: 15 }),
      cache_read: z.number().optional().meta({ description: "Cache read cost per 1M tokens (USD)", example: 0.3 }),
      cache_write: z.number().optional().meta({ description: "Cache write cost per 1M tokens (USD)", example: 3.75 }),
      reasoning: z.number().optional().meta({ description: "Reasoning token cost per 1M tokens (USD)" }),
      input_audio: z.number().optional().meta({ description: "Audio input cost per 1M tokens (USD)" }),
      output_audio: z.number().optional().meta({ description: "Audio output cost per 1M tokens (USD)" }),
      context_over_200k: z
        .object({
          input: z.number().optional(),
          output: z.number().optional(),
        })
        .optional()
        .meta({ description: "Tiered pricing for contexts over 200k tokens" }),
    })
    .meta({ description: "Model pricing in USD per 1M tokens" });
  export type Cost = z.infer<typeof Cost>;

  export const Limit = z
    .object({
      context: z.number().optional().meta({ description: "Context window size in tokens", example: 200000 }),
      output: z.number().optional().meta({ description: "Max output tokens", example: 64000 }),
      input: z.number().optional().meta({ description: "Max input tokens" }),
    })
    .meta({ description: "Model token limits" });
  export type Limit = z.infer<typeof Limit>;

  export const Modalities = z.object({
    input: z.array(z.string()).optional(),
    output: z.array(z.string()).optional(),
  });
  export type Modalities = z.infer<typeof Modalities>;

  export const Info = z.object({
    id: z.string(),
    name: z.string(),
    family: z.string().optional(),
    attachment: z.boolean().optional(),
    reasoning: z.boolean().optional(),
    tool_call: z.boolean().optional(),
    interleaved: z.any().optional(),
    temperature: z.any().optional(),
    knowledge: z.string().optional(),
    release_date: z.string().optional(),
    last_updated: z.string().optional(),
    modalities: Modalities.optional(),
    open_weights: z.boolean().optional(),
    cost: Cost.optional(),
    limit: Limit.optional(),
    provider: z.any().optional(),
    status: z.string().optional(),
    structured_output: z.boolean().optional(),
  });
  export type Info = z.infer<typeof Info>;

  export const Provider = z.object({
    id: z.string(),
    name: z.string(),
    api: z.string().optional(),
    doc: z.string().optional(),
    env: z.union([z.string(), z.array(z.string())]).optional(),
    npm: z.string().optional(),
    models: z.record(z.string(), Info).optional(),
  });
  export type Provider = z.infer<typeof Provider>;

  export const ApiResponse = z.record(z.string(), Provider);
  export type ApiResponse = z.infer<typeof ApiResponse>;

  export const TokenCounts = z
    .object({
      input: z.number().int().min(0).meta({ description: "Input tokens", example: 50000 }),
      output: z.number().int().min(0).meta({ description: "Output tokens", example: 5000 }),
      cacheRead: z.number().int().min(0).optional().meta({ description: "Cache read tokens" }),
      cacheWrite: z.number().int().min(0).optional().meta({ description: "Cache write tokens" }),
      reasoning: z.number().int().min(0).optional().meta({ description: "Reasoning tokens" }),
    })
    .meta({ description: "Token counts from model usage" });
  export type TokenCounts = z.infer<typeof TokenCounts>;

  export const Pricing = z
    .object({
      model: z.string().meta({ description: "Resolved model ID", example: "claude-sonnet-4-6" }),
      provider: z.string().meta({ description: "Provider ID", example: "anthropic" }),
      cost: Cost,
    })
    .meta({ description: "Pricing record for a model" });
  export type Pricing = z.infer<typeof Pricing>;

  async function fetchApi(): Promise<ApiResponse> {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Models API error: ${res.status}`);
    return ApiResponse.parse(await res.json());
  }

  export async function list(): Promise<ApiResponse> {
    return withCache({ key: "models:list", ttl: TTL }, fetchApi);
  }

  export async function providers(): Promise<Provider[]> {
    return withCache({ key: "models:providers", ttl: TTL }, async () => {
      const data = await list();
      return Object.values(data);
    });
  }

  export async function provider(
    id: string,
  ): Promise<Provider | undefined> {
    return withCache(
      { key: "models:provider", params: [id], ttl: TTL },
      async () => {
        const data = await list();
        return data[id];
      },
    );
  }

  export async function allModels(): Promise<
    (Info & { providerId: string; providerName: string })[]
  > {
    return withCache({ key: "models:all-models", ttl: TTL }, async () => {
      const data = await list();
      const result: (Info & {
        providerId: string;
        providerName: string;
      })[] = [];
      for (const [providerId, prov] of Object.entries(data)) {
        if (!prov.models) continue;
        for (const model of Object.values(prov.models)) {
          result.push({ ...model, providerId, providerName: prov.name });
        }
      }
      return result;
    });
  }

  export function logoUrl(providerId: string): string {
    return `https://models.dev/logos/${providerId}.svg`;
  }

  /** Lookup pricing for a model ID using exact match, then longest-prefix-match. */
  export async function pricing(modelId: string): Promise<Pricing | null> {
    const models = await allModels();
    const lower = modelId.toLowerCase();

    // 1. Exact match
    const exact = models.find((m) => m.id.toLowerCase() === lower);
    if (exact?.cost)
      return { model: exact.id, provider: exact.providerId, cost: exact.cost };

    // 2. Longest prefix match (e.g. "claude-sonnet-4-6-20250514" → "claude-sonnet-4-6")
    const prefixMatches = models
      .filter((m) => lower.startsWith(m.id.toLowerCase()) && m.cost)
      .sort((a, b) => b.id.length - a.id.length);
    if (prefixMatches[0])
      return {
        model: prefixMatches[0].id,
        provider: prefixMatches[0].providerId,
        cost: prefixMatches[0].cost!,
      };

    return null;
  }

  /** Calculate cost in USD given token counts and a Cost record. All costs are $/1M tokens. */
  export function calculateCost(
    tokens: TokenCounts,
    cost: Cost,
  ): number {
    let total = 0;
    if (cost.input) total += (tokens.input / 1_000_000) * cost.input;
    if (cost.output) total += (tokens.output / 1_000_000) * cost.output;
    if (cost.cache_read && tokens.cacheRead)
      total += (tokens.cacheRead / 1_000_000) * cost.cache_read;
    if (cost.cache_write && tokens.cacheWrite)
      total += (tokens.cacheWrite / 1_000_000) * cost.cache_write;
    if (cost.reasoning && tokens.reasoning)
      total += (tokens.reasoning / 1_000_000) * cost.reasoning;
    return total;
  }

  /** Batch pricing lookup for multiple model IDs. */
  export async function pricingBatch(
    modelIds: string[],
  ): Promise<Record<string, Pricing | null>> {
    const result: Record<string, Pricing | null> = {};
    for (const id of modelIds) {
      result[id] = await pricing(id);
    }
    return result;
  }
}
