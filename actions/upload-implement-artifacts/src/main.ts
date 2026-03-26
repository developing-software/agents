import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";

const agentsToken = core.getInput("agents_token");
const apiUrl = core.getInput("api_url") || "https://api.agents.developing.company/api";
const eventId = process.env.IMPLEMENT_EVENT_ID;
const metricsPath = process.env.IMPLEMENT_METRICS;
const artifactDir = process.env.IMPLEMENT_ARTIFACT_DIR;

async function uploadFile(name: string, filePath: string, contentType: string): Promise<void> {
  const form = new FormData();
  form.append("name", name);
  const bytes = readFileSync(filePath);
  form.append("file", new Blob([bytes], { type: contentType }), name);

  const res = await fetch(`${apiUrl}/github/events/${eventId}/artifacts`, {
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
  if (!eventId) {
    core.info("IMPLEMENT_EVENT_ID not set, skipping artifact upload");
    return;
  }
  if (!agentsToken) {
    core.warning("agents_token not set, skipping artifact upload");
    return;
  }

  if (metricsPath && existsSync(metricsPath)) {
    await uploadFile("metrics.txt", metricsPath, "text/plain");
  }

  if (artifactDir && existsSync(artifactDir) && statSync(artifactDir).isDirectory()) {
    for (const entry of readdirSync(artifactDir)) {
      const filePath = join(artifactDir, entry);
      if (!statSync(filePath).isFile()) continue;
      const contentType = entry.endsWith(".json") ? "application/json" : "text/plain";
      await uploadFile(entry, filePath, contentType);
    }
  }
}

run().catch(core.setFailed);
