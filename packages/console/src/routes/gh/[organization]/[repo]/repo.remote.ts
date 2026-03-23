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
    inputs: z.record(z.string()).optional(),
  }),
  async ({ organization, repo, workflow_id, ref, inputs }) => {
    const found = await GithubRepo.findByFullName(`${organization}/${repo}`);
    if (!found) error(404, `Repository ${organization}/${repo} not found`);

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;
    if (!appId || !privateKey) error(500, "GitHub App credentials not configured");

    const app = GitHub.fromApp({ appId, privateKey });
    const octokit = await GitHub.installationClient(app, found.installationId);
    await octokit.rest.actions.createWorkflowDispatch({
      owner: organization,
      repo,
      workflow_id,
      ref,
      inputs,
    });
  },
);
