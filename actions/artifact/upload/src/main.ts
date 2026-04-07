import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { basename, join } from "path";
import * as core from "@actions/core";
import { createFetchWithRetry } from "@agents/actions-core";

const agentsToken = core.getInput("token") || process.env.DEV_AGENTS_TOKEN;
const apiUrl =
  core.getInput("url") ||
  process.env.DEV_AGENTS_API_URL ||
  "https://api.agents.developing.company/api";
const eventId = process.env.DEV_AGENTS_EVENT_ID || process.env.AGENTS_WORKFLOW_EVENT_ID;

// Use DEV_AGENTS_ARTIFACT_URL when available (set by event/init based on artifact:branch tag).
// Falls back to event-scoped artifact URL.
const uploadUrl =
  process.env.DEV_AGENTS_ARTIFACT_URL || (eventId ? `${apiUrl}/events/${eventId}/artifacts` : null);

async function uploadFile(filePath: string, name: string): Promise<void> {
  const contentType = filePath.endsWith(".json") ? "application/json" : "text/plain";
  const form = new FormData();
  form.append("name", name);
  form.append("file", new Blob([readFileSync(filePath)], { type: contentType }), name);

  const res = await createFetchWithRetry(120_000)(uploadUrl!, {
    method: "POST",
    headers: { Authorization: `Bearer ${agentsToken}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)");
    core.warning(`Failed to upload ${name}: HTTP ${res.status} — ${text}`);
  } else {
    core.info(`Uploaded ${name}`);
  }
}

async function run() {
  if (!agentsToken) {
    core.info("No agents token available, skipping artifact upload");
    return;
  }
  if (!uploadUrl) {
    core.info("No artifact URL or event ID available, skipping artifact upload");
    return;
  }

  const path = core.getInput("path", { required: true });
  const nameOverride = core.getInput("name");

  if (!existsSync(path)) {
    core.warning(`Artifact path not found: ${path}`);
    return;
  }

  const stat = statSync(path);

  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      const filePath = join(path, entry);
      if (!statSync(filePath).isFile()) continue;
      await uploadFile(filePath, entry);
    }
  } else {
    await uploadFile(path, nameOverride || basename(path));
  }
}

run().catch(core.setFailed);
