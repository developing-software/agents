// Runs inside the sandbox right after the agent exits (see agents/_common.sh):
// extract metrics, commit + push, then report to POST /agents/runs/{id}/finish.
import { resolveModel } from "@agents/core/events/agent/resolve";
import { createApi, enrichWithPricing, readEnv, uploadArtifact } from "./api";
import { getExtractor } from "./extractors";
import { commitAndPush } from "./git";
import { log, type ExtractorResult } from "./types";

/** First meaningful line of the prompt, as a PR/commit title. */
export function titleFromPrompt(prompt: string, agent: string): string {
  const line = prompt
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find(Boolean);
  const title = line ? line.slice(0, 120) : "agent changes";
  return `${agent}: ${title}`;
}

async function run() {
  const env = readEnv();
  if (!env) {
    log.warn("AGENTS_API_URL/AGENTS_API_TOKEN/AGENTS_EVENT_ID not set; not reporting this run.");
    return;
  }

  const agent = process.env.AGENT ?? "unknown";
  const exitCode = Number.parseInt(process.env.AGENT_EXIT ?? "1", 10);
  const startedMs = Number.parseInt(process.env.AGENT_STARTED_MS ?? "", 10);
  const title = titleFromPrompt(process.env.PROMPT ?? "", agent);
  const sdk = createApi(env);

  let result: ExtractorResult = {
    name: agent,
    sessionId: null,
    finalMessage: null,
    metrics: null,
    artifactPath: null,
    artifactName: null,
  };
  try {
    result = await getExtractor(agent)({
      agent,
      outDir: process.env.AGENTS_OUT ?? "/tmp/agents-out",
      model: process.env.MODEL ?? "",
    });
  } catch (err) {
    log.warn(`Metric extraction failed: ${err}`);
  }

  if (result.metrics?.model) result.metrics.model = resolveModel(result.metrics.model).model;
  const pricing = await enrichWithPricing(sdk, result.metrics);
  if (result.artifactPath && result.artifactName) {
    await uploadArtifact(env, result.artifactPath, result.artifactName);
  }

  let commit: Awaited<ReturnType<typeof commitAndPush>> = {
    outcome: "no-changes",
    pushed: false,
    diff: null,
  };
  try {
    commit = await commitAndPush({
      message: title,
      branch: process.env.BRANCH ?? "",
      initialSha: process.env.AGENT_INITIAL_SHA || null,
    });
  } catch (err) {
    log.warn(`Commit/push failed: ${err}`);
  }

  const { data, error } = await sdk.postAgentsRunsByIdFinish({
    id: env.eventId,
    agentRunFinishInput: {
      status: exitCode === 0 ? "success" : "failure",
      sessionId: result.sessionId,
      finalMessage: result.finalMessage,
      metrics: result.metrics,
      pricing,
      durationMs: Number.isFinite(startedMs) ? Math.max(0, Date.now() - startedMs) : 0,
      diff: commit.diff,
      pushed: commit.pushed,
      title,
    },
  });
  if (error) {
    log.warn(`Failed to report run: ${JSON.stringify(error)}`);
    return;
  }

  const pr = (data?.data as { pr?: { url?: string } } | undefined)?.pr?.url;
  log.info(`Run reported${pr ? `; pull request: ${pr}` : ""}`);
}

if (import.meta.main) {
  await run().catch((err) => log.warn(`Reporter crashed: ${err}`));
}
