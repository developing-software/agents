import { anthropic } from "@ai-sdk/anthropic";

export function createModel() {
  return anthropic("claude-sonnet-4-5-20250514");
}
