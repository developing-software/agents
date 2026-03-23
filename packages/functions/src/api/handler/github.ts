import { Hono } from "hono";
import { GitHubWebhook } from "@agents/core/github";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { GithubRepo } from "@agents/core/github/repo/index";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubPullRequest } from "@agents/core/github/repo/pull_request";
import { GitHub } from "@agents/core/github/client";
import { authRequired } from "../common";
import { z } from "zod";
import { validator } from "../common";

GitHubWebhook.init(process.env.GITHUB_WEBHOOK_SECRET ?? "dev_webhook_secret");

async function getRepoOrThrow(owner: string, repo: string) {
  const fullName = `${owner}/${repo}`;
  const found = await GithubRepo.findByFullName(fullName);
  if (!found) {
    throw new VisibleError(
      "not_found",
      ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
      `Repository ${fullName} not found`,
    );
  }
  return found;
}

export namespace GitHubApi {
  export const route = new Hono()
    .post("/webhook", async (c) => {
      const id = c.req.header("x-github-delivery");
      const name = c.req.header("x-github-event");
      const signature = c.req.header("x-hub-signature-256");

      if (!id || !name || !signature) {
        throw new VisibleError(
          "validation",
          ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
          "Missing required GitHub webhook headers",
        );
      }

      const rawBody = await c.req.text();
      await GitHubWebhook.verifyAndReceive({ id, name, rawBody, signature });
      return c.json({ ok: true }, 200);
    })

    // List all repos
    .get("/repos", authRequired, async (c) => {
      const repos = await GithubRepo.list();
      return c.json(repos, 200);
    })

    // Get a specific repo
    .get(
      "/repos/:owner/:repo",
      authRequired,
      validator("param", z.object({ owner: z.string(), repo: z.string() })),
      async (c) => {
        const { owner, repo } = c.req.valid("param");
        const found = await getRepoOrThrow(owner, repo);
        return c.json(found, 200);
      },
    )

    // List issues for a repo
    .get(
      "/repos/:owner/:repo/issues",
      authRequired,
      validator("param", z.object({ owner: z.string(), repo: z.string() })),
      async (c) => {
        const { owner, repo } = c.req.valid("param");
        const found = await getRepoOrThrow(owner, repo);
        const issues = await GithubIssue.listByRepo(found.id);
        return c.json(issues, 200);
      },
    )

    // List pull requests for a repo
    .get(
      "/repos/:owner/:repo/pulls",
      authRequired,
      validator("param", z.object({ owner: z.string(), repo: z.string() })),
      async (c) => {
        const { owner, repo } = c.req.valid("param");
        const found = await getRepoOrThrow(owner, repo);
        const pulls = await GithubPullRequest.listByRepo(found.id);
        return c.json(pulls, 200);
      },
    )

    // Dispatch a workflow on a repo
    .post(
      "/repos/:owner/:repo/actions/dispatch",
      authRequired,
      validator("param", z.object({ owner: z.string(), repo: z.string() })),
      validator(
        "json",
        z.object({
          workflow_id: z.string(),
          ref: z.string().default("main"),
          inputs: z.record(z.string()).optional(),
        }),
      ),
      async (c) => {
        const { owner, repo } = c.req.valid("param");
        const body = c.req.valid("json");
        const found = await getRepoOrThrow(owner, repo);

        const appId = process.env.GITHUB_APP_ID;
        const privateKey = process.env.GITHUB_PRIVATE_KEY;
        if (!appId || !privateKey) {
          throw new VisibleError(
            "internal",
            ErrorCodes.Server.INTERNAL_ERROR,
            "GitHub App credentials not configured",
          );
        }

        const app = GitHub.fromApp({ appId, privateKey });
        const octokit = await GitHub.installationClient(app, found.installationId);
        await octokit.rest.actions.createWorkflowDispatch({
          owner,
          repo,
          workflow_id: body.workflow_id,
          ref: body.ref,
          inputs: body.inputs,
        });

        return c.json({ ok: true }, 200);
      },
    );
}
