import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "https://llm.developing.company/v1";

// LiteLLM proxy — serves both Claude and OpenAI models behind one OpenAI-compatible API.
export function createModel(apiKey?: string, model: string = "claude-sonnet-4-6") {
  const litellm = createOpenAICompatible({
    name: "litellm",
    baseURL: process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL,
    apiKey: apiKey ?? process.env.LLM_API_KEY,
    supportsStructuredOutputs: true,
    includeUsage: true,
  });
  return litellm.chatModel(model);
}
