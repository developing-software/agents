import { command, query } from "$app/server";
import { z } from "zod";
import { AgentWorkflow } from "@agents/core/agent";
import { Api } from "@agents/core/api/api";
import { Repository } from "@agents/core/repository";
import { getProvider } from "@agents/core/git";
import { error } from "@sveltejs/kit";

async function resolveRepo(provider: string, organization: string, repo: string) {
  const found = await Repository.findByFullName(`${organization}/${repo}`);
  if (!found) error(404, `Repository ${organization}/${repo} not found`);
  if (found.source !== provider) {
    error(404, `Repository ${organization}/${repo} does not belong to ${provider}`);
  }
  return found;
}

export const dispatchAgent = command(
  z.object({
    provider: z.string(),
    organization: z.string(),
    repo: z.string(),
    agent: z.enum(AgentWorkflow.Agents),
    prompt: z.string().optional(),
    issueNumber: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    model: z.string().optional(),
    ref: z.string().default("dev"),
  }),
  async ({ provider, organization, repo, agent, prompt, issueNumber, tags, model, ref }) => {
    await resolveRepo(provider, organization, repo);
    await AgentWorkflow.dispatch({
      owner: organization,
      repo,
      agent,
      prompt,
      issueNumber,
      tags,
      model,
      ref,
    });
  },
);

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
  return Api.Personal.create();
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
