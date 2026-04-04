import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import { createApiClient, readContextTags, uniqueTags } from "@agents/actions-core";

function readDataDir(dir: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!existsSync(dir)) return result;

  const entries = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    const dataFile = join(entryPath, "data.json");

    if (existsSync(dataFile)) {
      // Leaf node — read data.json
      try {
        result[entry.name] = JSON.parse(readFileSync(dataFile, "utf-8"));
      } catch (err) {
        core.warning(`Failed to read ${entry.name}/data.json: ${err}`);
      }
    } else {
      // Recurse into subdirectory
      const nested = readDataDir(entryPath);
      if (Object.keys(nested).length > 0) {
        result[entry.name] = nested;
      }
    }
  }

  return result;
}

async function run() {
  const eventType = core.getState("type");
  const startMsStr = core.getState("start_ms");
  const startMs = startMsStr ? parseInt(startMsStr, 10) : Date.now();
  const startEventId = core.getState("start_event_id");
  const agentsToken = core.getState("token");
  const apiUrl = core.getState("url");

  if (!eventType) {
    core.info("No event type state found — setup likely failed, skipping teardown.");
    return;
  }

  const durationMs = Date.now() - startMs;
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const runUrl = process.env.DEV_AGENTS_RUN_URL ?? "";

  // Aggregate data from results directory
  const resultsDir = process.env.DEV_AGENTS_RESULTS_DIR;
  let data: Record<string, unknown> = {};

  if (resultsDir && existsSync(resultsDir)) {
    data = readDataDir(resultsDir);
  }

  // Add computed workflow data
  data.workflow = { durationMs, runUrl };

  // Read tags
  const tags = uniqueTags(readContextTags());

  // Emit {type}.completed event
  if (agentsToken) {
    try {
      const sdk = createApiClient(agentsToken, apiUrl);
      await sdk.postEvents({
        eventIngestInput: {
          repoFullName: repository,
          parentEventId: startEventId || null,
          origin: "action",
          type: `${eventType}.completed`,
          tags,
          data,
        },
      });
    } catch (err) {
      core.warning(`Failed to post ${eventType}.completed event: ${err}`);
    }
  }

  // Write job summary
  const summaryTitle = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  const summaryRows: string[][] = [["Duration", `${durationMs}ms`]];

  // List top-level data keys
  for (const key of Object.keys(data)) {
    if (key === "workflow") continue;
    summaryRows.push([
      key,
      typeof data[key] === "object" ? JSON.stringify(data[key]) : String(data[key]),
    ]);
  }

  await core.summary
    .addHeading(`${summaryTitle} Summary`)
    .addTable([
      [
        { data: "Metric", header: true },
        { data: "Value", header: true },
      ],
      ...summaryRows,
    ])
    .write();
}

run().catch(core.setFailed);
