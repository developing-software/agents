import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { createClient, createConfig } from "@agents/sdk/client";
import { DevAgentSdk } from "@agents/sdk";
import { createFetchWithRetry } from "@agents/sdk/fetch";

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

export function readEventPayload(): {
  issue?: IssuePayload;
  inputs?: Record<string, string>;
} {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH not set");
  return JSON.parse(readFileSync(eventPath, "utf8"));
}

/**
 * Extract issue number from tags like "gh:issue:42".
 * Returns undefined if no issue tag found.
 */
export function extractIssueFromTags(tags: string[]): number | undefined {
  for (const tag of tags) {
    const match = tag.match(/^gh:issue:(\d+)$/);
    if (match) return parseInt(match[1]!, 10);
  }
  return undefined;
}

/**
 * Extract PR number from tags like "gh:pr:99".
 * Returns undefined if no PR tag found.
 */
export function extractPrFromTags(tags: string[]): number | undefined {
  for (const tag of tags) {
    const match = tag.match(/^gh:pr:(\d+)$/);
    if (match) return parseInt(match[1]!, 10);
  }
  return undefined;
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
  // New: read from DEV_AGENTS_TAGS_DIR (flat files, one tag per file)
  const tagsDir = process.env.DEV_AGENTS_TAGS_DIR;
  if (tagsDir && existsSync(tagsDir)) {
    const files = readdirSync(tagsDir);
    return files.map((file) => readFileSync(join(tagsDir, file), "utf8").trim()).filter(Boolean);
  }
  // Legacy fallback: read from flat file
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

export { createFetchWithRetry } from "@agents/sdk/fetch";

export function createApiClient(token: string, baseUrl: string): DevAgentSdk {
  return new DevAgentSdk({
    client: createClient(
      createConfig({
        baseUrl,
        headers: { Authorization: `Bearer ${token}` },
        fetch: createFetchWithRetry(),
      }),
    ),
  });
}
