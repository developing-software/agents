import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { log, type ExtractorInputs, type ExtractorResult } from "../types";

/** Parse `claude -p --output-format stream-json` output (JSONL), or a JSON array of entries. */
export function parseClaudeOutput(raw: string): any[] {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  }
  return trimmed
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

export async function extractClaude(inputs: ExtractorInputs): Promise<ExtractorResult> {
  const executionFile = join(inputs.outDir, "claude.jsonl");
  const result: ExtractorResult = {
    name: "claude-code",
    sessionId: null,
    finalMessage: null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };

  if (!existsSync(executionFile)) {
    log.info("No Claude output found, skipping metric extraction");
    return result;
  }

  result.artifactPath = executionFile;
  result.artifactName = "claude_code_execution.jsonl";

  try {
    const entries = parseClaudeOutput(readFileSync(executionFile, "utf-8"));
    const init = entries.find((e) => e.type === "system" && e.subtype === "init");
    const lastResult = entries.filter((e) => e.type === "result").at(-1);
    if (!lastResult) {
      log.info("No result entry found in Claude output");
      return result;
    }

    result.sessionId = lastResult.session_id ?? init?.session_id ?? null;
    result.finalMessage = lastResult.result || null;
    result.metrics = {
      tokens: {
        input: lastResult.usage?.input_tokens ?? null,
        output: lastResult.usage?.output_tokens ?? null,
        reasoning: null,
        cache_read: lastResult.usage?.cache_read_input_tokens ?? null,
        cache_creation: lastResult.usage?.cache_creation_input_tokens ?? null,
      },
      turns: typeof lastResult.num_turns === "number" ? lastResult.num_turns : null,
      cost_usd: typeof lastResult.total_cost_usd === "number" ? lastResult.total_cost_usd : null,
      model: lastResult.model || init?.model || inputs.model || null,
    };
  } catch (err) {
    log.warn(`Failed to parse Claude output: ${err}`);
  }

  return result;
}
