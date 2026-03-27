import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { R2Bucket } from "@cloudflare/workers-types";
import { GitHubWebhook } from "@agents/core/github";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { GithubRepo } from "@agents/core/github/repo/index";
import { Event } from "@agents/core/events/index";
import { Tags, OriginType } from "@agents/core/events/types";
import { Result, validator, ErrorResponses, authRequired } from "../common";
import { Examples } from "@agents/core/examples";

GitHubWebhook.init(process.env.GITHUB_WEBHOOK_SECRET ?? "dev_webhook_secret");

export namespace GitHubApi {
  export const route = new Hono<{ Bindings: { Artifacts: R2Bucket } }>()
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
                schema: Result(Event.Info),
                example: Examples.Event,
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
            parentEventId: Event.Info.shape.parentEventId.optional().meta({
              description: "Parent event ID to group related events.",
              example: null,
            }),
            issueNumber: z.number().int().nullable().optional().meta({
              description: "Linked issue number, if any.",
              example: 42,
            }),
            pullRequestNumber: z.number().int().nullable().optional().meta({
              description: "Linked pull request number, if any.",
              example: null,
            }),
            origin: z.enum(OriginType).meta({
              description: "Origin of the event.",
              example: Examples.Event.origin,
            }),
            type: Event.Info.shape.type,
            data: Event.Info.shape.data.optional(),
          })
          .meta({
            description: "Event to record.",
            example: {
              repoFullName: Examples.GithubRepo.fullName,
              issueNumber: 42,
              origin: Examples.Event.origin,
              type: Examples.Event.type,
              data: Examples.Event.data,
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

        const tags: string[] = [Tags.ghRepo(body.repoFullName)];
        if (body.issueNumber) tags.push(Tags.ghIssue(body.issueNumber));
        if (body.pullRequestNumber) tags.push(Tags.ghPr(body.pullRequestNumber));

        const id = await Event.create({
          source: "github_repo",
          sourceId: repo.id,
          origin: body.origin,
          type: body.type,
          tags,
          data: body.data,
          parentEventId: body.parentEventId ?? undefined,
        });
        const event = await Event.fromID(id);
        return c.json(event!, 200);
      },
    )

    .post(
      "/events/:id/artifacts",
      describeRoute({
        tags: ["GitHub"],
        summary: "Upload artifact",
        description: "Upload a file artifact associated with an event.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(Event.Artifact.Info),
                example: Examples.EventArtifact,
              },
            },
            description: "The uploaded artifact metadata.",
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
        "param",
        z.object({
          id: Event.Info.shape.id,
        }),
      ),
      async (c) => {
        const { id } = c.req.valid("param");
        const event = await Event.fromID(id);
        if (!event) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `Event ${id} not found`,
          );
        }

        const body = await c.req.parseBody();
        const file = body["file"];
        const name = body["name"];

        if (!file || !(file instanceof File)) {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
            "Missing required `file` field",
          );
        }
        if (!name || typeof name !== "string") {
          throw new VisibleError(
            "validation",
            ErrorCodes.Validation.MISSING_REQUIRED_FIELD,
            "Missing required `name` field",
          );
        }

        const artifact = await Event.Artifact.upload(
          c.env.Artifacts,
          id,
          name,
          file.stream(),
          file.type || "application/octet-stream",
        );
        return c.json(artifact, 200);
      },
    );
}
