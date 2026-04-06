import { AgentEvent } from "@agents/core/events/agent";
import type { ExtractorInputs, ExtractorResult } from "../types";
import { extractClaude } from "./claude";
import { extractCodex } from "./codex";
import { extractOpencode } from "./opencode";

const extractors: Record<string, (inputs: ExtractorInputs) => Promise<ExtractorResult>> = {
  "claude-code": extractClaude,
  codex: extractCodex,
  opencode: extractOpencode,
};

export function getExtractor(agent: string): (inputs: ExtractorInputs) => Promise<ExtractorResult> {
  const canonical = AgentEvent.resolveAgent(agent);
  const extractor = extractors[canonical];
  if (!extractor) {
    throw new Error(`Unknown agent: "${agent}". Supported: ${Object.keys(extractors).join(", ")}`);
  }
  return extractor;
}
