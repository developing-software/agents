import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import { createApiClient, readContextTags, uniqueTags } from "@agents/actions-core";

function readResultsDir(resultsDir: string) {
  const checks: Array<{ category: string; name: string; outcome: string }> = [];
  const metadata: Record<string, unknown> = {};

  const entries = readdirSync(resultsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const entry of entries) {
    const entryPath = join(resultsDir, entry.name);

    if (entry.name === "metadata") {
      // Walk metadata/{key}/data.json
      const metaEntries = readdirSync(entryPath, { withFileTypes: true }).filter((d) => d.isDirectory());
      for (const metaEntry of metaEntries) {
        const dataPath = join(entryPath, metaEntry.name, "data.json");
        if (!existsSync(dataPath)) continue;
        try {
          metadata[metaEntry.name] = JSON.parse(readFileSync(dataPath, "utf-8"));
        } catch (err) {
          core.warning(`Failed to read metadata/${metaEntry.name}/data.json: ${err}`);
        }
      }
      continue;
    }

    // Walk {category}/{name}/result.json for checks
    const names = readdirSync(entryPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const nameDir of names) {
      const resultPath = join(entryPath, nameDir.name, "result.json");
      if (!existsSync(resultPath)) continue;
      try {
        const result = JSON.parse(readFileSync(resultPath, "utf-8"));
        checks.push({
          category: entry.name,
          name: nameDir.name,
          outcome: result.outcome ?? "unknown",
        });
      } catch (err) {
        core.warning(`Failed to read ${entry.name}/${nameDir.name}/result.json: ${err}`);
      }
    }
  }

  return { checks, metadata: Object.keys(metadata).length > 0 ? metadata : null };
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

  // Aggregate results
  const resultsDir = process.env.DEV_AGENTS_RESULTS_DIR;
  let checks: Array<{ category: string; name: string; outcome: string }> = [];
  let metadata: Record<string, unknown> | null = null;

  if (resultsDir && existsSync(resultsDir)) {
    const results = readResultsDir(resultsDir);
    checks = results.checks;
    metadata = results.metadata;
  }

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
          data: {
            durationMs,
            runUrl,
            checks,
            metadata,
          },
        },
      });
    } catch (err) {
      core.warning(`Failed to post ${eventType}.completed event: ${err}`);
    }
  }

  // Write job summary
  const summaryTitle = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  const summaryRows: string[][] = [["Duration", `${durationMs}ms`]];
  if (checks.length > 0) {
    for (const c of checks) {
      summaryRows.push([`${c.category}/${c.name}`, c.outcome]);
    }
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
