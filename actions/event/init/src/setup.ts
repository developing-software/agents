import { join } from "path";
import { mkdirSync, writeFileSync } from "fs";
import * as core from "@actions/core";
import { createApiClient, uniqueTags } from "@agents/actions-core";

function slugify(tag: string): string {
  // Extract the key portion (everything before the last :value segment for known patterns)
  // For "gh:repo:owner/repo" → "gh-repo"
  // For "harness:claude-code" → "harness"
  // For "check:tests/unit:success" → "check-tests-unit"
  const parts = tag.split(":");
  if (parts.length <= 2) return parts[0]!;
  // Use all parts except the last value, joined with -
  return parts.slice(0, -1).join("-").replace(/\//g, "-");
}

function writeTag(tagsDir: string, slug: string, value: string) {
  writeFileSync(join(tagsDir, slug), value + "\n");
}

function parseTagLines(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function run() {
  const startMs = Date.now();
  const eventType = core.getInput("type", { required: true });

  const runnerTemp = process.env.RUNNER_TEMP;
  if (!runnerTemp) throw new Error("RUNNER_TEMP not set");

  // Create results directory
  const resultsDir = join(runnerTemp, ".dev-agents-results");
  mkdirSync(resultsDir, { recursive: true });
  core.exportVariable("DEV_AGENTS_RESULTS_DIR", resultsDir);

  // Create tags directory
  const tagsDir = join(runnerTemp, ".dev-agents-tags");
  mkdirSync(tagsDir, { recursive: true });
  core.exportVariable("DEV_AGENTS_TAGS_DIR", tagsDir);

  // Compute run URL
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runUrl = `https://github.com/${repository}/actions/runs/${runId}`;
  core.exportVariable("DEV_AGENTS_RUN_URL", runUrl);

  // Write GitHub context tags
  if (repository) {
    writeTag(tagsDir, "gh-repo", `gh:repo:${repository}`);
  }
  if (runId) {
    writeTag(tagsDir, "gh-workflow", `gh:workflow:${runId}`);
  }

  const githubRef = process.env.GITHUB_REF ?? "";
  const prMatch = githubRef.match(/^refs\/pull\/(\d+)/);
  if (prMatch) {
    writeTag(tagsDir, "gh-pr", `gh:pr:${prMatch[1]}`);
  } else if (githubRef.startsWith("refs/heads/")) {
    const branch = githubRef.replace("refs/heads/", "");
    writeTag(tagsDir, "gh-branch", `gh:branch:${branch}`);
  }

  // Write user-provided tags
  const extraTagsRaw = core.getInput("tags");
  const extraTags = parseTagLines(extraTagsRaw);
  for (const tag of extraTags) {
    writeTag(tagsDir, slugify(tag), tag);
  }

  // Export token and URL so downstream actions pick them up from env
  const agentsToken = core.getInput("token");
  const apiUrl = core.getInput("url");
  if (agentsToken) {
    core.exportVariable("DEV_AGENTS_TOKEN", agentsToken);
  }
  if (apiUrl) {
    core.exportVariable("DEV_AGENTS_API_URL", apiUrl);
  }

  // Save state for teardown
  core.saveState("start_ms", startMs.toString());
  core.saveState("type", eventType);
  core.saveState("token", agentsToken);
  core.saveState("url", apiUrl);

  // Emit {type}.started event
  if (agentsToken) {
    try {
      // Collect all tags
      const allTags = uniqueTags(
        extraTags.concat(
          repository ? [`gh:repo:${repository}`] : [],
          runId ? [`gh:workflow:${runId}`] : [],
          prMatch ? [`gh:pr:${prMatch[1]}`] : [],
          githubRef.startsWith("refs/heads/")
            ? [`gh:branch:${githubRef.replace("refs/heads/", "")}`]
            : [],
        ),
      );

      let extraData: Record<string, unknown> = {};
      const dataInput = core.getInput("data");
      if (dataInput) {
        try {
          extraData = JSON.parse(dataInput);
        } catch {
          core.warning(`Failed to parse data input as JSON: ${dataInput}`);
        }
      }

      const sdk = createApiClient(agentsToken, apiUrl);
      const { data } = await sdk.postEvents({
        eventIngestInput: {
          repoFullName: repository,
          origin: "action",
          type: `${eventType}.started`,
          tags: allTags,
          data: {
            runUrl,
            ...extraData,
          },
        },
      });
      if (data?.id) {
        core.saveState("start_event_id", data.id);
        core.exportVariable("DEV_AGENTS_EVENT_ID", data.id);
      }
    } catch (err) {
      core.warning(`Failed to post ${eventType}.started event: ${err}`);
    }
  }
}

run().catch(core.setFailed);
