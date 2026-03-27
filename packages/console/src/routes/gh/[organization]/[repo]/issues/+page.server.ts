import type { PageServerLoad } from "./$types";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubEvent } from "@agents/core/github/event/index";
import type { R2Bucket } from "@cloudflare/workers-types";

export const load: PageServerLoad = async ({ parent, platform }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [], implementsByIssue: {} };

  const [issues, rawEvents] = await Promise.all([
    GithubIssue.list(repo),
    GithubEvent.listByRepo(repo.id, { typePrefix: "implement" }),
  ]);

  const bucket = platform?.env.Artifacts as R2Bucket | undefined;
  const eventsWithArtifacts = await Promise.all(
    rawEvents.map(async (event) => ({
      ...event,
      artifacts: bucket ? await GithubEvent.Artifact.listByEvent(bucket, event.id) : [],
    })),
  );

  const implementsByIssue: Record<number, typeof eventsWithArtifacts> = {};
  for (const event of eventsWithArtifacts) {
    if (event.issueNumber != null) {
      (implementsByIssue[event.issueNumber] ??= []).push(event);
    }
  }

  return { issues, implementsByIssue };
};
