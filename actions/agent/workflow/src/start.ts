import { join } from "path";
import { appendFileSync, mkdirSync } from "fs";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import {
  createApiClient,
  getContext,
  readEventPayload,
  readOptionalTags,
  uniqueTags,
} from "@agents/actions-core";

async function run() {
  const startMs = Date.now();
  const ctx = getContext();
  const { issue } = readEventPayload();

  const branch = `${ctx.prPrefix}/issue-${issue.number}-${ctx.runId}`;

  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) throw new Error("RUNNER_TEMP not set");

  const contextTagsFile = join(runnerTemp, ".agents-context-tags");
  core.exportVariable("AGENTS_CONTEXT_TAGS_FILE", contextTagsFile);

  // Create results directory for inter-step data exchange
  const resultsDir = join(runnerTemp, ".agents-results");
  mkdirSync(join(resultsDir, "agent"), { recursive: true });
  core.exportVariable("AGENTS_RESULTS_DIR", resultsDir);

  const harness = core.getInput("harness");
  const model = core.getInput("model");
  const baseBranch = core.getInput("base_branch") || process.env.GITHUB_REF_NAME || "";
  const extraTags = readOptionalTags(core.getInput("tags"));

  // Write initial context tags
  const contextTags = uniqueTags([
    `gh:repo:${ctx.repository}`,
    `gh:issue:${issue.number}`,
    `gh:branch:${branch}`,
    `gh:run:${ctx.runId}`,
    ...(baseBranch ? [`env:${baseBranch}`] : []),
    ...(harness ? [`harness:${harness}`] : []),
    ...(model ? [`model:${model}`] : []),
    ...extraTags,
  ]);
  appendFileSync(contextTagsFile, contextTags.join("\n") + "\n");

  // Agent name is the harness identifier (e.g. claude-code, codex, opencode)
  const agent = harness || null;

  // Persist state for finish phase
  core.saveState("pr_prefix", ctx.prPrefix);
  core.saveState("start_ms", startMs.toString());
  core.saveState("branch", branch);
  core.saveState("run_url", ctx.runUrl);
  core.saveState("base_branch", core.getInput("base_branch"));
  core.saveState("harness", harness);
  core.saveState("model", model);

  // Emit agent.started
  const agentsToken = core.getInput("token");
  const apiUrl = core.getInput("url");
  if (agentsToken) {
    try {
      const sdk = createApiClient(agentsToken, apiUrl);
      const { data } = await sdk.postEvents({
        eventIngestInput: {
          repoFullName: ctx.repository,
          origin: "action",
          type: "agent.started",
          tags: contextTags,
          data: {
            agent,
            harness: harness || null,
            model: model || null,
            branch,
            runUrl: ctx.runUrl,
          },
        },
      });
      if (data?.id) {
        core.saveState("start_event_id", data.id);
        core.exportVariable("AGENTS_WORKFLOW_EVENT_ID", data.id);
      }
    } catch (err) {
      core.warning(`Failed to post agent.started event: ${err}`);
    }
  }

  // Git config
  await exec.exec("git", ["config", "user.name", "github-actions[bot]"]);
  await exec.exec("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"]);

  // Create and push branch
  await exec.exec("git", ["checkout", "-b", branch]);
  await exec.exec("git", ["push", "origin", branch, "--force-with-lease"]);
}

run().catch(core.setFailed);
