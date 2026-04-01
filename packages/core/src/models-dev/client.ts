import { z } from "zod";
import { withCache } from "../cache/with";

const API_URL = "https://models.dev/api.json";
const TTL = 21600; // 6 hours

export namespace ModelsDev {
  export const Cost = z.object({
    input: z.number().optional(),
    output: z.number().optional(),
  });
  export type Cost = z.infer<typeof Cost>;

  export const Limit = z.object({
    context: z.number().optional(),
    output: z.number().optional(),
  });
  export type Limit = z.infer<typeof Limit>;

  export const Modalities = z.object({
    input: z.array(z.string()).optional(),
    output: z.array(z.string()).optional(),
  });
  export type Modalities = z.infer<typeof Modalities>;

  export const Model = z.object({
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
  export type Model = z.infer<typeof Model>;

  export const Provider = z.object({
    id: z.string(),
    name: z.string(),
    api: z.string().optional(),
    doc: z.string().optional(),
    env: z.union([z.string(), z.array(z.string())]).optional(),
    npm: z.string().optional(),
    models: z.record(z.string(), Model).optional(),
  });
  export type Provider = z.infer<typeof Provider>;

  export const ApiResponse = z.record(z.string(), Provider);
  export type ApiResponse = z.infer<typeof ApiResponse>;

  async function fetchApi(): Promise<ApiResponse> {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Models.dev API error: ${res.status}`);
    return ApiResponse.parse(await res.json());
  }

  export async function list(): Promise<ApiResponse> {
    return withCache({ key: "models-dev:list", ttl: TTL }, fetchApi);
  }

  export async function providers(): Promise<Provider[]> {
    return withCache({ key: "models-dev:providers", ttl: TTL }, async () => {
      const data = await list();
      return Object.values(data);
    });
  }

  export async function provider(
    id: string,
  ): Promise<Provider | undefined> {
    return withCache(
      { key: "models-dev:provider", params: [id], ttl: TTL },
      async () => {
        const data = await list();
        return data[id];
      },
    );
  }

  export async function allModels(): Promise<
    (Model & { providerId: string; providerName: string })[]
  > {
    return withCache({ key: "models-dev:all-models", ttl: TTL }, async () => {
      const data = await list();
      const result: (Model & {
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
}
