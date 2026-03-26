import type { Actions, PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { GithubEvent } from "@agents/core/github/event/index";
import { Api } from "@agents/core/api/api";
import { Actor } from "@agents/core/actor";
import type { R2Bucket } from "@cloudflare/workers-types";

export const load: PageServerLoad = async ({ parent, platform }) => {
  const { repo } = await parent();
  if (!repo) return { events: [], issues: [], pulls: [], newToken: null };

  const [issues, pulls, events] = await Promise.all([
    GithubIssue.list(repo),
    GithubPullRequest.list(repo),
    GithubEvent.listByRepo(repo.id, { limit: 30 }),
  ]);

  const bucket = platform?.env.Artifacts as R2Bucket | undefined;
  const eventsWithArtifacts = await Promise.all(
    events.map(async (event) => ({
      ...event,
      artifacts: bucket ? await GithubEvent.Artifact.listByEvent(bucket, event.id) : [],
    })),
  );

  return {
    events: eventsWithArtifacts,
    issues: issues.slice(0, 3),
    pulls: pulls.slice(0, 3),
    newToken: null as string | null,
  };
};

export const actions: Actions = {
  installToken: async ({ locals }) => {
    if (!locals.userID) throw redirect(302, "/");

    const token = await Actor.provide("system", { userID: locals.userID }, () =>
      Api.Personal.create(),
    );

    return { token: token.token };
  },
};
