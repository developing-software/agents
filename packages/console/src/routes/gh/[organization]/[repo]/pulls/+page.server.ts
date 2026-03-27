import type { PageServerLoad } from "./$types";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { GithubEvent } from "@agents/core/github/event/index";
import type { R2Bucket } from "@cloudflare/workers-types";

export const load: PageServerLoad = async ({ parent, platform }) => {
  const { repo } = await parent();
  if (!repo) return { pulls: [], implementsByPR: {} };

  const [pulls, rawEvents] = await Promise.all([
    GithubPullRequest.list(repo),
    GithubEvent.listByRepo(repo.id, { typePrefix: "implement" }),
  ]);

  const bucket = platform?.env.Artifacts as R2Bucket | undefined;
  const eventsWithArtifacts = await Promise.all(
    rawEvents.map(async (event) => ({
      ...event,
      artifacts: bucket ? await GithubEvent.Artifact.listByEvent(bucket, event.id) : [],
    })),
  );

  const implementsByPR: Record<number, typeof eventsWithArtifacts> = {};
  for (const event of eventsWithArtifacts) {
    if (event.pullRequestNumber != null) {
      (implementsByPR[event.pullRequestNumber] ??= []).push(event);
    }
  }

  return { pulls, implementsByPR };
};
