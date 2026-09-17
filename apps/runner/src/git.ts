import { $ } from "bun";
import { log } from "./types";

export interface CommitResult {
  outcome: "committed" | "already-committed" | "no-changes";
  pushed: boolean;
  diff: { linesAdded: number; linesRemoved: number } | null;
}

/** Sum `git diff --numstat` output, skipping binary files. */
export function sumNumstat(raw: string) {
  let linesAdded = 0;
  let linesRemoved = 0;
  for (const line of raw.split("\n")) {
    const [added, removed] = line.split("\t");
    if (!added || added === "-") continue;
    linesAdded += Number.parseInt(added, 10) || 0;
    linesRemoved += Number.parseInt(removed ?? "0", 10) || 0;
  }
  return { linesAdded, linesRemoved };
}

/**
 * Stage and commit whatever the agent left, push the branch, and measure the diff against
 * the commit the run started from.
 */
export async function commitAndPush(opts: {
  message: string;
  branch: string;
  initialSha: string | null;
}): Promise<CommitResult> {
  const head = (await $`git rev-parse HEAD`.quiet().text()).trim();
  const agentCommitted = Boolean(opts.initialSha && head !== opts.initialSha);

  await $`git add -A`.quiet();
  const staged = (await $`git diff --staged --quiet`.nothrow().quiet()).exitCode !== 0;

  if (!staged && !agentCommitted) {
    log.info("No changes to commit");
    return { outcome: "no-changes", pushed: false, diff: null };
  }

  if (staged) await $`git commit -m ${opts.message}`.quiet();

  const push = await $`git push -u origin HEAD:${opts.branch}`.nothrow();
  if (push.exitCode !== 0) {
    log.warn(`git push failed: ${push.stderr.toString()}`);
  }

  const base = opts.initialSha ?? "HEAD~1";
  const numstat = await $`git diff ${base}..HEAD --numstat`.nothrow().quiet().text();

  return {
    outcome: staged ? "committed" : "already-committed",
    pushed: push.exitCode === 0,
    diff: sumNumstat(numstat),
  };
}
