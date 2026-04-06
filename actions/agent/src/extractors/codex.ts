import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import type { ExtractorInputs, ExtractorResult } from "../types";

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

    if (files[0]) {
      core.info(`Found Codex rollout: ${files[0].path}`);
      return files[0].path;
    }
  }

  core.info(`Searched for Codex sessions in: ${candidates.join(", ")}`);
  return null;
}

export async function extractCodex(inputs: ExtractorInputs): Promise<ExtractorResult> {
  const result: ExtractorResult = {
    name: "codex",
    sessionId: null,
    finalMessage: inputs.finalMessage || null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };

  const rolloutPath = inputs.executionFile || findLatestRollout();
  if (!rolloutPath || !existsSync(rolloutPath)) {
    core.info("No Codex session file found, skipping metric extraction");
    return result;
  }

  // Copy to temp for artifact upload
  const tempPath = join(process.env.RUNNER_TEMP ?? "/tmp", "codex-session.jsonl");
  try {
    copyFileSync(rolloutPath, tempPath);
    result.artifactPath = tempPath;
    result.artifactName = "codex_session.jsonl";
  } catch {
    core.warning("Failed to copy Codex session file for artifact upload");
  }

  try {
    const lines = readFileSync(rolloutPath, "utf-8").split("\n").filter(Boolean);

    let lastTokenUsage: any = null;
    let model: string | null = null;
    let turnCount = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Token counts: last event_msg with payload.type === "token_count"
        if (
          entry.type === "event_msg" &&
          entry.payload?.type === "token_count" &&
          entry.payload?.info?.total_token_usage
        ) {
          lastTokenUsage = entry.payload.info.total_token_usage;
        }

        // Model: from turn_context events
        if (entry.type === "turn_context") {
          if (entry.payload?.model) model = entry.payload.model;
          turnCount++;
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    const input = lastTokenUsage?.input_tokens ?? null;
    const output = lastTokenUsage?.output_tokens ?? null;
    const reasoning = lastTokenUsage?.reasoning_output_tokens ?? null;
    const cacheRead = lastTokenUsage?.cached_input_tokens ?? null;

    result.metrics = {
      tokens: {
        input,
        output,
        reasoning,
        cache_read: cacheRead,
        cache_creation: null,
      },
      turns: turnCount > 0 ? turnCount : null,
      cost_usd: null,
      model: model || inputs.model || null,
    };
  } catch (err) {
    core.warning(`Failed to parse Codex session file: ${err}`);
  }

  return result;
}
