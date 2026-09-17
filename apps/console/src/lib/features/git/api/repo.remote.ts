import { command, query, getRequestEvent } from "$app/server";
import { z } from "zod";
import { Api } from "@agents/core/api/api";
import { getProvider } from "@agents/core/git";
import { error } from "@sveltejs/kit";
import { withRequestRepoActor } from "$lib/server/repository.server";

async function resolveRepo(provider: string, organization: string, repo: string) {
  return withRequestRepoActor({ provider, organization, repoName: repo }, async (found) => {
    if (found.source !== provider) {
      error(404, `Repository ${organization}/${repo} does not belong to ${provider}`);
    }
    return found;
  });
}

export const dispatchAction = command(
  z.object({
    provider: z.string(),
    organization: z.string(),
    repo: z.string(),
    workflow_id: z.string(),
    ref: z.string().default("main"),
    inputs: z.record(z.string(), z.any()).optional(),
  }),
  async ({ provider, organization, repo, workflow_id, ref, inputs }) => {
    const found = await resolveRepo(provider, organization, repo);
    await getProvider(found.source).actions.dispatch(found.fullName, {
      action: workflow_id,
      ref,
      inputs: inputs as Record<string, string> | undefined,
    });
  },
);

export const generateToken = command(z.object({}), async () => {
  const event = getRequestEvent();
  return withRequestRepoActor(
    {
      provider: event.params.provider,
      organization: event.params.org ?? error(500, "Missing org parameter"),
      repoName: event.params.repo ?? error(500, "Missing repo parameter"),
    },
    async () => Api.Personal.create({}),
  );
});

export const listWorkflowRuns = query(
  z.object({
    provider: z.string(),
    organization: z.string(),
    repo: z.string(),
    workflow_id: z.string(),
  }),
  async ({ provider, organization, repo, workflow_id }) => {
    const found = await resolveRepo(provider, organization, repo);
    return getProvider(found.source).actions.listRuns(found.fullName, {
      action: workflow_id,
    });
  },
);
