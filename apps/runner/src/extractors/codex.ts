import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { log, type ExtractorInputs, type ExtractorResult } from "../types";

/** Recursively collect rollout-*.jsonl files under a directory. */
function collectRollouts(dir: string, out: { path: string; mtime: number }[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRollouts(full, out);
    } else if (entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) {
      out.push({ path: full, mtime: statSync(full).mtimeMs });
    }
  }
}

function findLatestRollout(): string | null {
  const candidates = [
    process.env.CODEX_HOME ? join(process.env.CODEX_HOME, "sessions") : null,
    join(process.env.HOME ?? "~", ".codex", "sessions"),
  ].filter(Boolean) as string[];

  for (const sessionsDir of candidates) {
    if (!existsSync(sessionsDir)) continue;

    const files: { path: string; mtime: number }[] = [];
    collectRollouts(sessionsDir, files);
    files.sort((a, b) => b.mtime - a.mtime);

    if (files[0]) return files[0].path;
  }

  log.info(`No Codex sessions in: ${candidates.join(", ")}`);
  return null;
}

export function parseCodexRollout(raw: string, fallbackModel: string | null) {
  let lastTokenUsage: any = null;
  let model: string | null = null;
  let sessionId: string | null = null;
  let turnCount = 0;

  for (const line of raw.split("\n").filter(Boolean)) {
    try {
      const entry = JSON.parse(line);

      if (entry.type === "session_meta" && entry.payload?.id) sessionId = entry.payload.id;

      // Token counts: last event_msg with payload.type === "token_count"
      if (
        entry.type === "event_msg" &&
        entry.payload?.type === "token_count" &&
        entry.payload?.info?.total_token_usage
      ) {
        lastTokenUsage = entry.payload.info.total_token_usage;
      }

      if (entry.type === "turn_context") {
        if (entry.payload?.model) model = entry.payload.model;
        turnCount++;
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  return {
    sessionId,
    metrics: {
      tokens: {
        input: lastTokenUsage?.input_tokens ?? null,
        output: lastTokenUsage?.output_tokens ?? null,
        reasoning: lastTokenUsage?.reasoning_output_tokens ?? null,
        cache_read: lastTokenUsage?.cached_input_tokens ?? null,
        cache_creation: null,
      },
      turns: turnCount > 0 ? turnCount : null,
      cost_usd: null,
      model: model || fallbackModel,
    },
  };
}

export async function extractCodex(inputs: ExtractorInputs): Promise<ExtractorResult> {
  const lastMessageFile = join(inputs.outDir, "codex-last-message.txt");
  const result: ExtractorResult = {
    name: "codex",
    sessionId: null,
    finalMessage: existsSync(lastMessageFile)
      ? readFileSync(lastMessageFile, "utf-8").trim() || null
      : null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };

  const rolloutPath = findLatestRollout();
  if (!rolloutPath) return result;

  result.artifactPath = rolloutPath;
  result.artifactName = "codex_session.jsonl";

  try {
    const parsed = parseCodexRollout(readFileSync(rolloutPath, "utf-8"), inputs.model || null);
    result.sessionId = parsed.sessionId;
    result.metrics = parsed.metrics;
  } catch (err) {
    log.warn(`Failed to parse Codex session file: ${err}`);
  }

  return result;
}
