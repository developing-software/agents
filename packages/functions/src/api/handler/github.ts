import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { GitHubWebhook } from "@agents/core/github";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { GithubRepo } from "@agents/core/github/repo/index";
import { GithubEvent } from "@agents/core/github/event/index";
import { Result, validator, ErrorResponses, authRequired } from "../common";
import { Examples } from "@agents/core/examples";

GitHubWebhook.init(process.env.GITHUB_WEBHOOK_SECRET ?? "dev_webhook_secret");

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

    .post(
      "/events",
      describeRoute({
        tags: ["GitHub"],
        summary: "Create event",
        description:
          "Record a GitHub or agent event linked to a repository and optionally an issue or pull request. Intended for use by `actions/implement` and other external sources.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(GithubEvent.Info),
                example: Examples.GithubEvent,
              },
            },
            description: "The created event.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator(
        "json",
        z
          .object({
            repoFullName: z.string().meta({
              description: "Full repository name in `owner/repo` format.",
              example: Examples.GithubRepo.fullName,
            }),
            issueNumber: z.number().int().optional().meta({
              description: "Issue number to link the event to.",
              example: Examples.GithubEvent.issueNumber,
            }),
            pullRequestNumber: z.number().int().optional().meta({
              description: "Pull request number to link the event to.",
              example: 7,
            }),
            source: z.enum(["webhook", "action"]).meta({
              description: "Origin of the event.",
              example: Examples.GithubEvent.source,
            }),
            type: z.string().meta({
              description: "Event type, e.g. `implement.completed`.",
              example: Examples.GithubEvent.type,
            }),
            payload: z.record(z.string(), z.unknown()).optional().meta({
              description: "Arbitrary event data.",
              example: Examples.GithubEvent.payload,
            }),
          })
          .meta({
            description: "Event to record.",
            example: {
              repoFullName: Examples.GithubRepo.fullName,
              issueNumber: Examples.GithubEvent.issueNumber,
              source: Examples.GithubEvent.source,
              type: Examples.GithubEvent.type,
              payload: Examples.GithubEvent.payload,
            },
          }),
      ),
      async (c) => {
        const body = c.req.valid("json");
        const repo = await GithubRepo.findByFullName(body.repoFullName);
        if (!repo) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `Repository ${body.repoFullName} not found`,
          );
        }
        const id = await GithubEvent.create({
          repoId: repo.id,
          issueNumber: body.issueNumber,
          pullRequestNumber: body.pullRequestNumber,
          source: body.source,
          type: body.type,
          payload: body.payload,
        });
        const events = await GithubEvent.listByRepo(repo.id, {
          issueNumber: body.issueNumber,
          pullRequestNumber: body.pullRequestNumber,
        });
        const event = events.find((e) => e.id === id)!;
        return c.json(event, 200);
      },
    );
}
