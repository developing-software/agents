import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import { execWithOutput } from "@agents/actions-core";
import type { ExtractorInputs, ExtractorResult } from "../types";

export async function extractOpencode(inputs: ExtractorInputs): Promise<ExtractorResult> {
  const result: ExtractorResult = {
    name: "opencode",
    sessionId: null,
    finalMessage: null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };

  const exportFile = join(process.env.RUNNER_TEMP ?? "/tmp", "opencode-session.json");

  try {
    // Get the most recent session ID
    const listOutput = await execWithOutput("opencode", [
      "session",
      "list",
      "--format",
      "json",
      "-n",
      "1",
    ]);
    const sessions = JSON.parse(listOutput);
    const sessionId = sessions?.[0]?.id;

    if (!sessionId) {
      core.info("No OpenCode session found");
      return result;
    }

    result.sessionId = sessionId;

    // Export session JSON
    const exportOutput = await execWithOutput("opencode", ["export", sessionId]);
    writeFileSync(exportFile, exportOutput);

    if (!existsSync(exportFile)) {
      core.warning("Failed to write OpenCode session export");
      return result;
    }

    result.artifactPath = exportFile;
    result.artifactName = "opencode_session.json";

    const session = JSON.parse(readFileSync(exportFile, "utf-8"));
    const messages: any[] = session.messages ?? [];
    const assistantMsgs = messages.filter((m: any) => m.info?.role === "assistant");

    if (assistantMsgs.length === 0) {
      core.info("No assistant messages in OpenCode session");
      return result;
    }

    let totalInput = 0;
    let totalOutput = 0;
    let totalReasoning = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let totalCost = 0;

    for (const msg of assistantMsgs) {
      const tokens = msg.info?.tokens;
      if (tokens) {
        totalInput += tokens.input ?? 0;
        totalOutput += tokens.output ?? 0;
        totalReasoning += tokens.reasoning ?? 0;
        totalCacheRead += tokens.cache?.read ?? 0;
        totalCacheWrite += tokens.cache?.write ?? 0;
      }
      totalCost += msg.info?.cost ?? 0;
    }

    const lastAssistant = assistantMsgs.at(-1);
    const model = lastAssistant?.info?.modelID || inputs.model || null;
    const finalMessage =
      lastAssistant?.parts?.filter((p: any) => p.type === "text")?.at(-1)?.text || null;

    result.finalMessage = finalMessage;
    result.metrics = {
      tokens: {
        input: totalInput || null,
        output: totalOutput || null,
        reasoning: totalReasoning || null,
        cache_read: totalCacheRead || null,
        cache_creation: totalCacheWrite || null,
      },
      turns: assistantMsgs.length,
      cost_usd: totalCost || null,
      model,
    };
  } catch (err) {
    core.warning(`Failed to extract OpenCode metrics: ${err}`);
  }

  return result;
}
