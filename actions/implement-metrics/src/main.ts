import { join } from "path";
import { appendFileSync } from "fs";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import {
  createApiClient,
  getContext,
  metricTags,
  readEventPayload,
  readOptionalTags,
  uniqueTags,
} from "./utils";

async function run() {
  const startMs = Date.now();
  const ctx = getContext();
  const { issue } = readEventPayload();

  const branch = `${ctx.prPrefix}/issue-${issue.number}-${ctx.runId}`;

  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) throw new Error("RUNNER_TEMP not set");
  const metricsFile = join(runnerTemp, ".implement-metrics");
  core.exportVariable("IMPLEMENT_METRICS", metricsFile);

  const harness = core.getInput("harness");
  const model = core.getInput("model");
  const extraTags = readOptionalTags(core.getInput("tags"));
  if (harness) appendFileSync(metricsFile, `harness=${harness}\n`);
  if (model) appendFileSync(metricsFile, `model=${model}\n`);

  const metadata = core.getInput("metadata");
  if (metadata) appendFileSync(metricsFile, metadata.trimEnd() + "\n");

  core.saveState("pr_prefix", ctx.prPrefix);
  core.saveState("start_ms", startMs.toString());
  core.saveState("branch", branch);
  core.saveState("run_url", ctx.runUrl);
  core.saveState("base_branch", core.getInput("base_branch"));

  // Post implement.started event via API
  const agentsToken = core.getInput("agents_token");
  const apiUrl = core.getInput("api_url");
  if (agentsToken) {
    try {
      const sdk = createApiClient(agentsToken, apiUrl);
      const tags = uniqueTags([
        `gh:repo:${ctx.repository}`,
        `gh:issue:${issue.number}`,
        `gh:branch:${branch}`,
        `gh:run:${ctx.runId}`,
        ...(harness ? [`harness:${harness}`] : []),
        ...(model ? [`model:${model}`] : []),
        ...extraTags,
      ]);
      const { data } = await sdk.postEvents({
        eventIngestInput: {
          repoFullName: ctx.repository,
          origin: "action",
          type: "agents.implement.started",
          tags,
          data: {
            harness: harness || null,
            model: model || null,
            branch,
            runUrl: ctx.runUrl,
          },
        },
      });
      if (data?.id) {
        core.saveState("start_event_id", data.id);
        core.exportVariable("IMPLEMENT_EVENT_ID", data.id);
      }
    } catch (err) {
      core.warning(`Failed to post implement.started event: ${err}`);
    }
  }

  // Git config
  await exec.exec("git", ["config", "user.name", "github-actions[bot]"]);
  await exec.exec("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"]);

  // Create and push branch — credentials are provided by actions/checkout
  await exec.exec("git", ["checkout", "-b", branch]);
  await exec.exec("git", ["push", "origin", branch, "--force-with-lease"]);
}

run().catch(core.setFailed);
