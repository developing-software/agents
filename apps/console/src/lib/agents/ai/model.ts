import { createAnthropic } from "@ai-sdk/anthropic";

export function createModel(apiKey?: string, model: string = "claude-sonnet-4-6") {
  const anthropic = createAnthropic({
    apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
  });
  return anthropic(model);
}
