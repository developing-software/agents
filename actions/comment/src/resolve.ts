import * as core from "@actions/core";
import { extractIssueFromTags, extractPrFromTags, readContextTags } from "@agents/actions-core";

/**
 * Resolve all target issue/PR numbers to comment on.
 *
 * Collects unique targets from:
 * - gh:issue:N tag (the originating issue)
 * - gh:pr:N tag (created PR)
 * - issue_number input (explicit override)
 *
 * Returns empty array if no targets can be resolved.
 */
export function resolveTargets(): number[] {
  const tags = readContextTags();
  const targets = new Set<number>();

  const issueNumber = extractIssueFromTags(tags);
  if (issueNumber != null) {
    core.info(`Resolved comment target from gh:issue tag: #${issueNumber}`);
    targets.add(issueNumber);
  }

  const prNumber = extractPrFromTags(tags);
  if (prNumber != null) {
    core.info(`Resolved comment target from gh:pr tag: #${prNumber}`);
    targets.add(prNumber);
  }

  const inputNumber = core.getInput("issue_number");
  if (inputNumber) {
    const parsed = parseInt(inputNumber, 10);
    if (!Number.isNaN(parsed)) {
      core.info(`Resolved comment target from issue_number input: #${parsed}`);
      targets.add(parsed);
    }
  }

  return Array.from(targets);
}
