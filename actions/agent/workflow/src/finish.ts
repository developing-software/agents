import { appendFileSync, existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import {
  createApiClient,
  execWithOutput,
  readContextTags,
  readEventPayload,
  readOptionalTags,
  uniqueTags,
} from "@agents/actions-core";

async function findExistingPrUrl(branch: string): Promise<string> {
  const output = await execWithOutput("gh", ["pr", "list", "--head", branch, "--json", "url"]);
  const pullRequests = JSON.parse(output) as Array<{ url?: string }>;
  return pullRequests[0]?.url?.trim() ?? "";
}

function readResultsFolder(resultsDir: string) {
  let agent: string | null = null;
  let metrics: Record<string, unknown> | null = null;

  // Read agent result
  const agentResultPath = join(resultsDir, "agent", "result.json");
  if (existsSync(agentResultPath)) {
    try {
      const agentResult = JSON.parse(readFileSync(agentResultPath, "utf-8"));
      agent = agentResult.agent ?? null;
      metrics = agentResult.metrics ?? null;
    } catch (err) {
      core.warning(`Failed to read agent/result.json: ${err}`);
    }
  }

  // Walk results dir: */*/result.json (skip agent/)
  const checks: Array<{ category: string; name: string; outcome: string }> = [];
  const categories = readdirSync(resultsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "agent");
  for (const catDir of categories) {
    const catPath = join(resultsDir, catDir.name);
    const names = readdirSync(catPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const nameDir of names) {
      const resultPath = join(catPath, nameDir.name, "result.json");
      if (!existsSync(resultPath)) continue;
      try {
        const result = JSON.parse(readFileSync(resultPath, "utf-8"));
        checks.push({ category: catDir.name, name: nameDir.name, outcome: result.outcome ?? "unknown" });
      } catch (err) {
        core.warning(`Failed to read ${catDir.name}/${nameDir.name}/result.json: ${err}`);
      }
    }
  }

  return { agent, metrics, checks };
}

async function run() {
  const prPrefix = core.getState("pr_prefix");
  const startMsStr = core.getState("start_ms");
  const startMs = startMsStr ? parseInt(startMsStr, 10) : Date.now();
  const branch = core.getState("branch");
  const runUrl = core.getState("run_url");
  const startEventId = core.getState("start_event_id");
  const harness = core.getState("harness");
  const model = core.getState("model");

  const commentId = core.getState("comment_id") || process.env.AGENTS_COMMENT_ID;

  if (!branch) {
    core.warning("No branch state found — main step likely failed, skipping finish.");
    return;
  }

  if (!prPrefix) {
    core.setFailed("pr_prefix state is empty — cannot create PR.");
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const { issue } = readEventPayload();
  const extraTags = readOptionalTags(core.getInput("tags"));

  // Re-configure git credentials (local scope to avoid polluting global git config)
  const encodedAuth = Buffer.from(`x-access-token:${token}`).toString("base64");
  await exec.exec("git", [
    "config",
    "--local",
    "http.https://github.com/.extraheader",
    `AUTHORIZATION: basic ${encodedAuth}`,
  ]);

  // Check if agent made its own commits (e.g. OpenCode commits directly)
  const initialSha = core.getState("initial_sha");
  const currentSha = (await execWithOutput("git", ["rev-parse", "HEAD"])).trim();
  const agentCommitted = initialSha && currentSha !== initialSha;

  // Stage any remaining uncommitted changes
  await exec.exec("git", ["add", "-A"]);
  const diffCode = await exec.exec("git", ["diff", "--staged", "--quiet"], {
    ignoreReturnCode: true,
  });

  if (diffCode === 0 && !agentCommitted) {
    // No uncommitted changes AND no agent commits — truly no changes
    if (commentId) {
      try {
        const body = [
          `> **Agent workflow failed**`,
          `>`,
          `> **Run:** [View workflow run](${runUrl})`,
          `>`,
          `> No changes were made by the agent.`,
        ].join("\n");
        await execWithOutput("gh", [
          "api",
          `repos/${repository}/issues/comments/${commentId}`,
          "-X",
          "PATCH",
          "-f",
          `body=${body}`,
        ]);
      } catch (err) {
        core.warning(`Failed to update issue comment: ${err}`);
      }
    }
    core.setFailed("No changes to commit — agent made no modifications.");
    return;
  }

  // Commit remaining unstaged changes (if any)
  if (diffCode !== 0) {
    await exec.exec("git", ["commit", "-m", `feat: implement issue #${issue.number}`]);
  } else {
    core.info("Agent already committed all changes — no additional commit needed.");
  }

  await exec.exec("git", ["push", "origin", branch]);

  // Resolve base branch (needed before diff)
  let baseBranch = core.getState("base_branch");
  if (!baseBranch) {
    try {
      baseBranch = await execWithOutput("gh", [
        "repo",
        "view",
        "--json",
        "defaultBranchRef",
        "-q",
        ".defaultBranchRef.name",
      ]);
    } catch (err) {
      core.warning(`Could not resolve default branch, falling back to "main": ${err}`);
      baseBranch = "main";
    }
  }

  // Collect diff metrics against base branch
  await exec.exec("git", ["fetch", "origin", baseBranch, "--depth=1"]);
  const diffStat = await execWithOutput("git", [
    "diff",
    `origin/${baseBranch}..HEAD`,
    "--numstat",
  ]);
  let linesAdded = 0;
  let linesRemoved = 0;
  for (const line of diffStat.split("\n").filter(Boolean)) {
    const [added, removed] = line.split("\t");
    linesAdded += parseInt(added!) || 0;
    linesRemoved += parseInt(removed!) || 0;
  }
  const durationMs = Date.now() - startMs;

  // Create PR
  const prTitle = prPrefix.charAt(0).toUpperCase() + prPrefix.slice(1);
  const prBody = `Closes #${issue.number}\n\n---\nGenerated by [${prPrefix}](${runUrl})`;
  let prUrl = "";
  try {
    prUrl = await execWithOutput("gh", [
      "pr",
      "create",
      "--title",
      `${prTitle}: ${issue.title}`,
      "--body",
      prBody,
      "--base",
      baseBranch,
      "--head",
      branch,
    ]);
  } catch (err) {
    // Check if a PR already exists for this branch (idempotent re-run)
    try {
      prUrl = await findExistingPrUrl(branch);
    } catch (lookupErr) {
      core.warning(`PR creation failed and existing PR lookup also failed: ${lookupErr}`);
    }

    if (prUrl) {
      core.info(`PR already exists: ${prUrl}`);
    } else {
      core.warning(`PR creation failed but continuing without PR URL: ${err}`);
    }
  }

  const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
  const pullRequestNumber = prNumberMatch ? parseInt(prNumberMatch[1]!) : undefined;

  // Append PR tag to context (keep for event inheritance)
  const contextTagsFile = process.env.AGENTS_CONTEXT_TAGS_FILE;
  if (contextTagsFile && pullRequestNumber) {
    appendFileSync(contextTagsFile, `gh:pr:${pullRequestNumber}\n`);
  }

  // Aggregate results from results folder
  const resultsDir = process.env.AGENTS_RESULTS_DIR;
  let agentName: string | null = null;
  let metrics: Record<string, unknown> | null = null;
  let checks: Array<{ category: string; name: string; outcome: string }> = [];

  if (resultsDir && existsSync(resultsDir)) {
    const results = readResultsFolder(resultsDir);
    agentName = results.agent;
    metrics = results.metrics;
    checks = results.checks;
  }

  // Derive agent name: results folder > harness state > prPrefix fallback
  if (!agentName && harness) {
    agentName = harness;
  }
  if (!agentName) {
    agentName = prPrefix;
  }

  // Derive model: from agent result metrics > saved state
  let modelName: string | null = model || null;
  if (!modelName && metrics && typeof (metrics as Record<string, unknown>).model === "string") {
    modelName = (metrics as Record<string, unknown>).model as string;
  }

  // Emit agent.completed with aggregated data
  const agentsToken = core.getInput("token");
  const apiUrl = core.getInput("url");
  if (agentsToken) {
    const sdk = createApiClient(agentsToken, apiUrl);
    try {
      const tags = uniqueTags([...readContextTags(), ...extraTags]);
      await sdk.postEvents({
        eventIngestInput: {
          repoFullName: repository,
          parentEventId: startEventId || null,
          origin: "action",
          type: "agent.completed",
          tags,
          data: {
            agent: agentName,
            model: modelName,
            branch,
            issueNumber: issue.number,
            pullRequestNumber: pullRequestNumber ?? null,
            linesAdded,
            linesRemoved,
            durationMs,
            prUrl,
            runUrl,
            metrics,
            checks,
          },
        },
      });
    } catch (err) {
      core.warning(`Failed to post agent.completed event: ${err}`);
    }
  }

  // Write job summary
  await core.summary
    .addHeading(`${prTitle} Implementation`)
    .addTable([
      [
        { data: "Metric", header: true },
        { data: "Value", header: true },
      ],
      ["Agent", agentName],
      ...(modelName ? [["Model", modelName]] : []),
      ["Branch", `\`${branch}\``],
      ["Lines added", linesAdded.toString()],
      ["Lines removed", linesRemoved.toString()],
      ["Duration", `${durationMs}ms`],
      ["PR", prUrl],
      ["Run", runUrl],
      ...(checks.length > 0
        ? checks.map((c) => [`${c.category}/${c.name}`, c.outcome])
        : []),
    ])
    .write();

  // Update the progress comment on the issue
  if (commentId) {
    try {
      const durationSec = Math.round(durationMs / 1000);
      const checksLine =
        checks.length > 0
          ? checks.map((c) => `> - **${c.category}/${c.name}:** ${c.outcome}`).join("\n") + "\n"
          : "";
      const body = [
        `> **Agent workflow completed**`,
        `>`,
        `> **Run:** [View workflow run](${runUrl})`,
        `> **Branch:** \`${branch}\``,
        `> **Agent:** ${agentName}`,
        ...(modelName ? [`> **Model:** ${modelName}`] : []),
        ...(prUrl ? [`> **PR:** ${prUrl}`] : []),
        `> **Duration:** ${durationSec}s`,
        `> **Lines:** +${linesAdded} / -${linesRemoved}`,
        ...(checksLine ? [`>`, checksLine.trimEnd()] : []),
      ].join("\n");
      await execWithOutput("gh", [
        "api",
        `repos/${repository}/issues/comments/${commentId}`,
        "-X",
        "PATCH",
        "-f",
        `body=${body}`,
      ]);
    } catch (err) {
      core.warning(`Failed to update issue comment: ${err}`);
    }
  }
}

run().catch(core.setFailed);
