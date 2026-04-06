import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import { createApiClient, readContextTags, uniqueTags } from "@agents/actions-core";

interface WorkflowStatus {
  conclusion: string | null;
  jobs: Array<{ name: string; conclusion: string | null }>;
}

/**
 * Fetch workflow status from the GitHub Jobs API.
 * By post-handler time all regular steps have completed, so their
 * conclusions are available. Returns the conclusion of the current job
 * (derived from step outcomes) and metadata for all jobs in the run.
 */
async function fetchWorkflowStatus(): Promise<WorkflowStatus> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const jobId = process.env.GITHUB_JOB; // job key from YAML, e.g. "implement"
  if (!token || !repo || !runId) return { conclusion: null, jobs: [] };

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return { conclusion: null, jobs: [] };

    const data = (await res.json()) as {
      jobs?: Array<{
        name: string;
        status: string;
        conclusion: string | null;
        steps?: Array<{ conclusion: string | null }>;
      }>;
    };
    if (!data.jobs?.length) return { conclusion: null, jobs: [] };

    // Build jobs metadata — completed jobs have their conclusion,
    // the current job gets its conclusion derived from step outcomes
    const jobs: WorkflowStatus["jobs"] = [];
    let conclusion: string | null = null;

    // Find the current job by GITHUB_JOB key.
    // For workflow_call the API name is prefixed (e.g. "caller / implement"),
    // so we match exact name OR name ending with " / {jobId}".
    const isCurrentJob = (name: string) =>
      jobId != null && (name === jobId || name.endsWith(` / ${jobId}`));

    for (const job of data.jobs) {
      if (isCurrentJob(job.name)) {
        // Current job — derive conclusion from step outcomes
        // (the job itself is still in_progress during post handlers)
        const steps = job.steps ?? [];
        const derived = steps.some((s) => s.conclusion === "failure")
          ? "failure"
          : steps.some((s) => s.conclusion === "cancelled")
            ? "cancelled"
            : "success";
        conclusion = derived;
        jobs.push({ name: job.name, conclusion: derived });
      } else {
        jobs.push({ name: job.name, conclusion: job.conclusion });
      }
    }

    return { conclusion, jobs };
  } catch {
    return { conclusion: null, jobs: [] };
  }
}

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
  const trigger = process.env.GITHUB_EVENT_NAME ?? "";

  // Aggregate data from results directory
  const resultsDir = process.env.DEV_AGENTS_RESULTS_DIR;
  let data: Record<string, unknown> = {};

  if (resultsDir && existsSync(resultsDir)) {
    data = readDataDir(resultsDir);
  }

  // Fetch workflow status from GitHub Jobs API
  const status = await fetchWorkflowStatus();

  // Add computed workflow data
  data.workflow = {
    durationMs,
    runUrl,
    trigger,
    conclusion: status.conclusion,
    jobs: status.jobs.length > 0 ? status.jobs : undefined,
  };

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
