import * as core from "@actions/core";
import { createClient, createConfig } from "@agents/sdk/client";
import { DevAgentSdk } from "@agents/sdk";
import { readContextTags } from "@agents/actions-core";

function readTags(raw: string) {
  return [
    ...new Set(
      raw
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function githubTags(): string[] {
  const tags: string[] = [];
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const ref = process.env.GITHUB_REF; // refs/heads/main or refs/pull/123/merge
  const refName = process.env.GITHUB_REF_NAME; // main or 123/merge

  if (repo) tags.push(`gh:repo:${repo}`);
  if (runId) tags.push(`gh:run:${runId}`);

  const prMatch = ref?.match(/^refs\/pull\/(\d+)\//);
  if (prMatch) {
    tags.push(`gh:pr:${prMatch[1]}`);
  } else if (refName && ref?.startsWith("refs/heads/")) {
    tags.push(`gh:branch:${refName}`);
  }

  return tags;
}

function readData(raw: string): Record<string, unknown> | undefined {
  if (!raw.trim()) return undefined;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("`data` must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

async function run() {
  const agentsToken = core.getInput("token") || process.env.DEV_AGENTS_TOKEN;
  if (!agentsToken) {
    core.warning("token not set, skipping event emit");
    return;
  }
  const apiUrl = core.getInput("url") || process.env.DEV_AGENTS_API_URL || "https://api.agents.developing.company/api";
  const eventIdEnv = core.getInput("event_id_env") || "EVENT_ID";
  const inheritContext = core.getInput("inherit_context") !== "false";
  const parentEventId =
    core.getInput("parent_event_id") ||
    (inheritContext ? (process.env.DEV_AGENTS_EVENT_ID || process.env.AGENTS_WORKFLOW_EVENT_ID) : "") ||
    "";
  const origin = core.getInput("origin") as
    | "api"
    | "webhook"
    | "action"
    | "console"
    | "cli"
    | "cron";
  const type = core.getInput("type", { required: true });
  const explicitTags = readTags(core.getInput("tags"));
  const contextTags = inheritContext ? readContextTags() : [];
  const tags = [...new Set([...githubTags(), ...contextTags, ...explicitTags])];
  const data = readData(core.getInput("data"));
  const repoFullName = process.env.GITHUB_REPOSITORY;

  if (!repoFullName) {
    throw new Error("GITHUB_REPOSITORY is not set");
  }

  const sdk = new DevAgentSdk({
    client: createClient(
      createConfig({
        baseUrl: apiUrl,
        headers: { Authorization: `Bearer ${agentsToken}` },
      }),
    ),
  });

  const { data: event, error } = await sdk.postEvents({
    eventIngestInput: {
      repoFullName,
      parentEventId: parentEventId || undefined,
      origin,
      type,
      tags,
      data,
    },
  });

  if (error || !event?.id) {
    const detail = error ? JSON.stringify(error) : "no id in response";
    core.warning(`Failed to emit event "${type}": ${detail}`);
    return;
  }

  core.setOutput("event_id", event.id);
  core.exportVariable(eventIdEnv, event.id);
  core.info(`Created event ${event.id}`);
}

run().catch(core.setFailed);
