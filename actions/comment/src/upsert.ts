import * as core from "@actions/core";
import * as github from "@actions/github";
import { COMMENT_MARKER } from "./types";

type Octokit = ReturnType<typeof github.getOctokit>;

/**
 * Find an existing comment with the dev-agents marker.
 * Returns the comment ID and body if found, null otherwise.
 * Never throws.
 */
export async function findExistingComment(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  issueNumber: number;
}): Promise<{ id: number; body: string } | null> {
  const { octokit, owner, repo, issueNumber } = params;
  try {
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });

    const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));
    if (!existing) return null;
    return { id: existing.id, body: existing.body ?? "" };
  } catch {
    return null;
  }
}

/**
 * Create or update the dev-agents comment on an issue/PR.
 * If a comment with the marker already exists, update it. Otherwise create a new one.
 * Never throws -- failures are logged as warnings.
 */
export async function upsertComment(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  issueNumber: number;
  body: string;
}): Promise<void> {
  const { octokit, owner, repo, issueNumber, body } = params;
  try {
    const existing = await findExistingComment({ octokit, owner, repo, issueNumber });

    if (existing) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existing.id,
        body,
      });
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
    }
  } catch (error) {
    core.warning(`Failed to upsert comment: ${error}`);
  }
}
