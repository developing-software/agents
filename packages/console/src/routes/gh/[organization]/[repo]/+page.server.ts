import type { Actions, PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { Api } from "@agents/core/api/api";
import { Actor } from "@agents/core/actor";

export const load: PageServerLoad = async ({ parent }) => {
  const { repo } = await parent();
  if (!repo) return { issues: [], pulls: [], newToken: null };

  const [issues, pulls] = await Promise.all([GithubIssue.list(repo), GithubPullRequest.list(repo)]);

  return {
    issues: issues.slice(0, 5),
    pulls: pulls.slice(0, 5),
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
