import type { ExtractorInputs, ExtractorResult } from "../types";
import { extractClaude } from "./claude";
import { extractCodex } from "./codex";
import { extractOpencode } from "./opencode";

const extractors: Record<string, (inputs: ExtractorInputs) => Promise<ExtractorResult>> = {
  "claude-code": extractClaude,
  claude: extractClaude,
  codex: extractCodex,
  opencode: extractOpencode,
} as const;

export function getExtractor(agent: string): (inputs: ExtractorInputs) => Promise<ExtractorResult> {
  const extractor = extractors[agent];
  if (!extractor) {
    throw new Error(`Unknown agent: "${agent}". Supported: ${Object.keys(extractors).join(", ")}`);
  }
  return extractor;
}
