import { writeFileSync } from "fs";
import { join } from "path";
import { $ } from "bun";
import { log, type ExtractorInputs, type ExtractorResult } from "../types";

export function parseOpencodeSession(session: any, fallbackModel: string | null) {
  const messages: any[] = session?.messages ?? [];
  const assistantMsgs = messages.filter((m) => m.info?.role === "assistant");
  if (assistantMsgs.length === 0) return null;

  let input = 0;
  let output = 0;
  let reasoning = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let cost = 0;

  for (const msg of assistantMsgs) {
    const tokens = msg.info?.tokens;
    if (tokens) {
      input += tokens.input ?? 0;
      output += tokens.output ?? 0;
      reasoning += tokens.reasoning ?? 0;
      cacheRead += tokens.cache?.read ?? 0;
      cacheWrite += tokens.cache?.write ?? 0;
    }
    cost += msg.info?.cost ?? 0;
  }

  const last = assistantMsgs.at(-1);
  return {
    finalMessage:
      last?.parts?.filter((p: any) => p.type === "text")?.at(-1)?.text || (null as string | null),
    metrics: {
      tokens: {
        input: input || null,
        output: output || null,
        reasoning: reasoning || null,
        cache_read: cacheRead || null,
        cache_creation: cacheWrite || null,
      },
      turns: assistantMsgs.length,
      cost_usd: cost || null,
      model: (last?.info?.modelID as string | undefined) || fallbackModel,
    },
  };
}

export async function extractOpencode(inputs: ExtractorInputs): Promise<ExtractorResult> {
  const result: ExtractorResult = {
    name: "opencode",
    sessionId: null,
    finalMessage: null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };

  try {
    const sessions = await $`opencode session list --format json -n 1`.quiet().json();
    const sessionId = sessions?.[0]?.id;
    if (!sessionId) {
      log.info("No OpenCode session found");
      return result;
    }
    result.sessionId = sessionId;

    const exported = await $`opencode export ${sessionId}`.quiet().text();
    const exportFile = join(inputs.outDir, "opencode-session.json");
    writeFileSync(exportFile, exported);
    result.artifactPath = exportFile;
    result.artifactName = "opencode_session.json";

    const parsed = parseOpencodeSession(JSON.parse(exported), inputs.model || null);
    if (parsed) {
      result.finalMessage = parsed.finalMessage;
      result.metrics = parsed.metrics;
    }
  } catch (err) {
    log.warn(`Failed to extract OpenCode metrics: ${err}`);
  }

  return result;
}
