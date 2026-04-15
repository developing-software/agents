import * as core from "@actions/core";
import * as github from "@actions/github";
import { buildProgressBody } from "./body/progress";
import { buildSummaryBody } from "./body/summary";
import { readResultsDir } from "./results";
import { resolveTargets } from "./resolve";
import type { CommentPhase, ResultsData } from "./types";
import { findExistingComment, upsertComment } from "./upsert";

async function run(): Promise<void> {
  const phase = core.getInput("phase", { required: true }) as CommentPhase;

  // Resolve which issue/PRs to comment on
  const targets = resolveTargets();
  if (targets.length === 0) {
    core.info("No issue/PR targets resolved from tags or inputs -- skipping comment.");
    return;
  }

  // GitHub auth
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning("GITHUB_TOKEN not set -- skipping comment.");
    return;
  }

  const octokit = github.getOctokit(token);
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (!owner || !repo) {
    core.warning("GITHUB_REPOSITORY not set -- skipping comment.");
    return;
  }

  if (phase === "progress") {
    const body = buildProgressBody({
      agent: core.getInput("agent") || process.env.DEV_AGENTS_HARNESS || "agent",
      model: core.getInput("model") || process.env.MODEL || null,
      runUrl:
        process.env.DEV_AGENTS_RUN_URL ||
        `https://github.com/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID ?? ""}`,
      branch: process.env.DEV_AGENTS_BRANCH || null,
    });
    for (const issueNumber of targets) {
      await upsertComment({ octokit, owner, repo, issueNumber, body });
    }
  } else {
    // Summary phase — post to each target independently (each has its own run history)
    const resultsDir = process.env.DEV_AGENTS_RESULTS_DIR;
    const results: ResultsData = resultsDir
      ? readResultsDir(resultsDir)
      : { agent: null, diff: null, pr: null, checks: null };

    for (const issueNumber of targets) {
      const existing = await findExistingComment({ octokit, owner, repo, issueNumber });

      const body = buildSummaryBody({
        results,
        existingBody: existing?.body ?? null,
        runUrl: process.env.DEV_AGENTS_RUN_URL || "",
        consoleUrl: core.getInput("console_url") || null,
        eventId: process.env.DEV_AGENTS_EVENT_ID || null,
      });
      await upsertComment({ octokit, owner, repo, issueNumber, body });
    }
  }
}

// Never fail the workflow -- comment posting is informational
run().catch((error) => {
  core.warning(`Comment action failed: ${error}`);
});
