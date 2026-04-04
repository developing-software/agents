import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import type { ExtractorResult, AgentPricing } from "./types";

export async function writeResults(
  result: ExtractorResult,
  pricing: AgentPricing | null,
  status: string | null,
): Promise<void> {
  const resultsDir = process.env.DEV_AGENTS_RESULTS_DIR;
  if (!resultsDir) {
    core.info("DEV_AGENTS_RESULTS_DIR not set, skipping data.json write");
    return;
  }

  const agentDir = join(resultsDir, "agent");
  mkdirSync(agentDir, { recursive: true });

  // Backfill cost from pricing when agent didn't report it
  if (result.metrics && result.metrics.cost_usd == null && pricing?.cost_usd != null) {
    result.metrics.cost_usd = pricing.cost_usd;
  }

  const output: Record<string, unknown> = {
    name: result.name,
    sessionId: result.sessionId,
    finalMessage: result.finalMessage,
    status,
    metrics: result.metrics,
  };

  if (pricing) {
    output.pricing = pricing;
  }

  writeFileSync(join(agentDir, "data.json"), JSON.stringify(output));
  core.info("Wrote agent/data.json");
}

export async function writeEmptyResults(agent?: string): Promise<void> {
  const resultsDir = process.env.DEV_AGENTS_RESULTS_DIR;
  if (!resultsDir) return;

  const agentDir = join(resultsDir, "agent");
  mkdirSync(agentDir, { recursive: true });

  const output = {
    name: agent ?? "unknown",
    sessionId: null,
    finalMessage: null,
    metrics: null,
  };

  writeFileSync(join(agentDir, "data.json"), JSON.stringify(output));
}

export async function uploadArtifact(result: ExtractorResult): Promise<void> {
  if (!result.artifactPath || !existsSync(result.artifactPath)) return;

  const token = process.env.DEV_AGENTS_TOKEN;
  const eventId = process.env.DEV_AGENTS_EVENT_ID || process.env.AGENTS_WORKFLOW_EVENT_ID;
  const apiUrl = process.env.DEV_AGENTS_API_URL || "https://api.agents.developing.company/api";

  if (!token || !eventId) {
    core.info("No token or event ID, skipping artifact upload");
    return;
  }

  const name = result.artifactName ?? "agent-session";
  const contentType = result.artifactPath.endsWith(".json") ? "application/json" : "text/plain";

  try {
    const form = new FormData();
    form.append("name", name);
    form.append("file", new Blob([readFileSync(result.artifactPath)], { type: contentType }), name);

    const res = await fetch(`${apiUrl}/events/${eventId}/artifacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      core.warning(`Failed to upload ${name}: HTTP ${res.status} — ${text}`);
    } else {
      core.info(`Uploaded artifact: ${name}`);
    }
  } catch (err) {
    core.warning(`Artifact upload failed: ${err}`);
  }
}
