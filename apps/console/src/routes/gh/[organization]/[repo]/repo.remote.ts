import { command, query } from "$app/server";
import { z } from "zod";
import { GithubWorkflow } from "@agents/core/github/repo/workflow";
import { AgentWorkflow } from "@agents/core/agent";
import { Api } from "@agents/core/api/api";
import { Actor } from "@agents/core/actor";
import { Repository } from "@agents/core/repository";
import { error } from "@sveltejs/kit";

export const dispatchAgent = command(
  z.object({
    organization: z.string(),
    repo: z.string(),
    agent: z.enum(AgentWorkflow.Agents),
    prompt: z.string().optional(),
    issueNumber: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
    model: z.string().optional(),
    ref: z.string().default("dev"),
  }),
  async ({ organization, repo, agent, prompt, issueNumber, tags, model, ref }) => {
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
    organization: z.string(),
    repo: z.string(),
    workflow_id: z.string(),
    ref: z.string().default("main"),
    inputs: z.record(z.string(), z.any()).optional(),
  }),
  async ({ organization, repo, workflow_id, ref, inputs }) => {
    const found = await Repository.findByFullName(`${organization}/${repo}`);
    if (!found) error(404, `Repository ${organization}/${repo} not found`);

    await GithubWorkflow.dispatch(found, workflow_id, ref, inputs);
  },
);

export const generateToken = command(z.object({}), async () => {
  const userID = Actor.userID();
  return Actor.provide("system", { userID }, () => Api.Personal.create());
});

export const listWorkflowRuns = query(
  z.object({
    organization: z.string(),
    repo: z.string(),
    workflow_id: z.number(),
  }),
  async ({ organization, repo, workflow_id }) => {
    const found = await Repository.findByFullName(`${organization}/${repo}`);
    if (!found) error(404, `Repository ${organization}/${repo} not found`);

    return GithubWorkflow.Run.list(found, workflow_id);
  },
);
