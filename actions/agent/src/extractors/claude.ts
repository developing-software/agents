import { existsSync, readFileSync } from "fs";
import * as core from "@actions/core";
import type { ExtractorInputs, ExtractorResult } from "../types";

export async function extractClaude(inputs: ExtractorInputs): Promise<ExtractorResult> {
  const result: ExtractorResult = {
    name: "claude-code",
    sessionId: inputs.sessionId || null,
    finalMessage: null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };

  if (!inputs.executionFile || !existsSync(inputs.executionFile)) {
    core.info("No execution file found, skipping Claude metric extraction");
    return result;
  }

  result.artifactPath = inputs.executionFile;
  result.artifactName = "claude_code_execution.json";

  try {
    const entries = JSON.parse(readFileSync(inputs.executionFile, "utf-8"));
    if (!Array.isArray(entries)) {
      core.warning("Execution file is not a JSON array");
      return result;
    }

    const lastResult = entries.filter((e: any) => e.type === "result").at(-1);
    if (!lastResult) {
      core.info("No result entry found in execution file");
      return result;
    }

    const input = lastResult.usage?.input_tokens ?? null;
    const output = lastResult.usage?.output_tokens ?? null;
    const cacheRead = lastResult.usage?.cache_read_input_tokens ?? null;
    const cacheCreation = lastResult.usage?.cache_creation_input_tokens ?? null;
    const turns = typeof lastResult.num_turns === "number" ? lastResult.num_turns : null;
    const costUsd =
      typeof lastResult.total_cost_usd === "number" ? lastResult.total_cost_usd : null;
    const model = lastResult.model || inputs.model || null;
    const finalMessage = lastResult.result || null;

    result.finalMessage = finalMessage;
    result.metrics = {
      tokens: {
        input,
        output,
        reasoning: null,
        cache_read: cacheRead,
        cache_creation: cacheCreation,
      },
      turns,
      cost_usd: costUsd,
      model,
    };
  } catch (err) {
    core.warning(`Failed to parse Claude execution file: ${err}`);
  }

  return result;
}
