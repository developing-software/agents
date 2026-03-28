import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { existsSync, readFileSync } from "fs";
import { createClient, createConfig } from "@agents/sdk/client";
import { DevAgentSdk } from "@agents/sdk";

export interface GitHubContext {
  token: string;
  repository: string;
  owner: string;
  repo: string;
  runId: string;
  runUrl: string;
  prPrefix: string;
}

export interface IssuePayload {
  number: number;
  title: string;
  body: string;
}

export function readEventPayload(): { issue: IssuePayload } {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH not set");
  const payload = JSON.parse(readFileSync(eventPath, "utf8"));
  if (typeof payload.issue?.number !== "number") {
    throw new Error(
      "Event payload missing issue data — this action requires an issue event context",
    );
  }
  return payload;
}

export function getContext(): GitHubContext {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const [owner, repo] = repository.split("/");
  const runId = process.env.GITHUB_RUN_ID ?? "";
  const runUrl = `https://github.com/${repository}/actions/runs/${runId}`;
  const prPrefix = core.getInput("pr_prefix") || core.getState("pr_prefix");

  return { token, repository, owner: owner!, repo: repo!, runId, runUrl, prPrefix };
}

export function readContextTags(): string[] {
  const contextFile = process.env.AGENTS_CONTEXT_TAGS_FILE;
  if (!contextFile || !existsSync(contextFile)) return [];
  return readFileSync(contextFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function readOptionalTags(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function uniqueTags(tags: string[]) {
  return [...new Set(tags.filter(Boolean))];
}

export async function execWithOutput(cmd: string, args: string[]): Promise<string> {
  let output = "";
  await exec.exec(cmd, args, {
    listeners: {
      stdout: (data) => (output += data.toString()),
      stderr: (data) => core.debug(data.toString()),
    },
  });
  return output.trim();
}

export function createApiClient(token: string, baseUrl: string): DevAgentSdk {
  return new DevAgentSdk({
    client: createClient(
      createConfig({
        baseUrl,
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  });
}
