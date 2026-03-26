import { command } from "$app/server";
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
