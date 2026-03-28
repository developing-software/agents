import * as core from "@actions/core";
import { createClient, createConfig } from "@agents/sdk/client";
import { DevAgentSdk } from "@agents/sdk";

function readTags(raw: string) {
  return [...new Set(raw.split(/[\n,]/).map((value) => value.trim()).filter(Boolean))];
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
  const agentsToken = core.getInput("agents_token", { required: true });
  const apiUrl = core.getInput("api_url");
  const eventIdEnv = core.getInput("event_id_env") || "EVENT_ID";
  const parentEventId = core.getInput("parent_event_id") || process.env[eventIdEnv] || "";
  const origin = core.getInput("origin") as
    | "api"
    | "webhook"
    | "action"
    | "console"
    | "cli"
    | "cron";
  const type = core.getInput("type", { required: true });
  const tags = readTags(core.getInput("tags"));
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

  const { data: event } = await sdk.postEvents({
    eventIngestInput: {
      repoFullName,
      parentEventId: parentEventId || undefined,
      origin,
      type,
      tags,
      data,
    },
  });

  if (!event?.id) {
    throw new Error("Event was created without an id");
  }

  core.setOutput("event_id", event.id);
  core.exportVariable(eventIdEnv, event.id);
  core.info(`Created event ${event.id}`);
}

run().catch(core.setFailed);
