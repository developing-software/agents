import * as core from "@actions/core";
import { extractIssueFromTags, extractPrFromTags, readContextTags } from "@agents/actions-core";

/**
 * Resolve the target issue/PR number to comment on.
 *
 * Priority:
 * 1. gh:issue:N tag (the originating issue)
 * 2. gh:pr:N tag (created PR)
 * 3. issue_number input (explicit override)
 *
 * Returns null if no target can be resolved.
 */
export function resolveTarget(): number | null {
  const tags = readContextTags();

  const issueNumber = extractIssueFromTags(tags);
  if (issueNumber != null) {
    core.info(`Resolved comment target from gh:issue tag: #${issueNumber}`);
    return issueNumber;
  }

  const prNumber = extractPrFromTags(tags);
  if (prNumber != null) {
    core.info(`Resolved comment target from gh:pr tag: #${prNumber}`);
    return prNumber;
  }

  const inputNumber = core.getInput("issue_number");
  if (inputNumber) {
    const parsed = parseInt(inputNumber, 10);
    if (!Number.isNaN(parsed)) {
      core.info(`Resolved comment target from issue_number input: #${parsed}`);
      return parsed;
    }
  }

  return null;
}
