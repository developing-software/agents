import { command, query } from "$app/server";
import { z } from "zod";
import { GithubRepo } from "@agents/core/github/repo/index";
import { GitHub } from "@agents/core/github/client";
import { error } from "@sveltejs/kit";

export const dispatchAction = command(
  z.object({
    organization: z.string(),
    repo: z.string(),
    workflow_id: z.string(),
    ref: z.string().default("main"),
    inputs: z.record(z.string(), z.any()).optional(),
  }),
  async ({ organization, repo, workflow_id, ref, inputs }) => {
    const found = await GithubRepo.findByFullName(`${organization}/${repo}`);
    if (!found) error(404, `Repository ${organization}/${repo} not found`);

    const octokit = await GitHub.appClient(found.installationId);
    await octokit.rest.actions.createWorkflowDispatch({
      owner: organization,
      repo,
      workflow_id,
      ref,
      inputs,
    });
  },
);

export const listWorkflowRuns = query(
  z.object({
    organization: z.string(),
    repo: z.string(),
    workflow_id: z.number(),
  }),
  async ({ organization, repo, workflow_id }) => {
    const found = await GithubRepo.findByFullName(`${organization}/${repo}`);
    if (!found) error(404, `Repository ${organization}/${repo} not found`);

    const octokit = await GitHub.appClient(found.installationId);
    const { data } = await octokit.rest.actions.listWorkflowRuns({
      owner: organization,
      repo,
      workflow_id,
      per_page: 20,
    });

    return data.workflow_runs.map((run) => ({
      id: run.id,
      status: run.status as string | null,
      conclusion: run.conclusion as string | null,
      headBranch: run.head_branch,
      commitMessage: run.head_commit?.message?.split("\n")[0] ?? "",
      actor: run.actor?.login ?? "unknown",
      createdAt: run.created_at,
      htmlUrl: run.html_url,
    }));
  },
);
