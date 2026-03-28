import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { R2Bucket } from "@cloudflare/workers-types";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { Event } from "@agents/core/events/index";
import { Repository } from "@agents/core/repository/index";
import { Result, validator, ErrorResponses, authRequired } from "../common";
import { Examples } from "@agents/core/examples";

async function resolveRepository(input: Event.IngestInput) {
  if (input.repositoryId) {
    const repository = await Repository.findByID(input.repositoryId);
    if (repository) return repository;
  }

  if (input.repoFullName) {
    const repository = await Repository.findByFullName(input.repoFullName);
    if (repository) return repository;
  }

  return null;
}

export namespace EventApi {
  export const route = new Hono<{ Bindings: { Artifacts: R2Bucket } }>()
    .post(
      "/",
      describeRoute({
        tags: ["Event"],
        summary: "Create event",
        description: "Record an event linked to a repository.",
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
      validator("json", Event.IngestInput),
      async (c) => {
        const body = c.req.valid("json");
        const repository = await resolveRepository(body);
        if (!repository) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `Repository ${body.repositoryId ?? body.repoFullName ?? ""} not found`,
          );
        }

        const id = await Event.create({
          source: "repository",
          sourceId: repository.id,
          parentEventId: body.parentEventId ?? undefined,
          origin: body.origin,
          type: body.type,
          tags: body.tags ?? [],
          data: body.data,
        });

        const event = await Event.fromID(id);
        return c.json(event!, 200);
      },
    )
    .post(
      "/:id/artifacts",
      describeRoute({
        tags: ["Event"],
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
