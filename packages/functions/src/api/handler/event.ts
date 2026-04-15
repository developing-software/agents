import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import type { R2Bucket } from "@cloudflare/workers-types";
import { ErrorCodes, VisibleError } from "@agents/core/error";
import { Event } from "@agents/core/events";
import { Result, validator, ErrorResponses, authRequired } from "../common";
import { Examples } from "@agents/core/examples";

const IngestInput = Event.Source.Ref.and(
  z.object({
    id: Event.Info.shape.id.optional().meta({
      description:
        "Client-generated event ID for idempotent creation. If omitted, the server generates one.",
      example: Examples.Event.id,
    }),
    parentEventId: Event.Info.shape.parentEventId.optional().meta({
      description: "Parent event ID to group related events.",
      example: null,
    }),
    origin: Event.Info.shape.origin,
    type: Event.Info.shape.type,
    tags: Event.Info.shape.tags.optional(),
    data: Event.Info.shape.data.optional(),
  }),
).meta({
  ref: "EventIngestInput",
  description: "Event payload submitted by external producers.",
  example: {
    repoFullName: Examples.Repository.fullName,
    origin: Examples.Event.origin,
    type: Examples.Event.type,
    tags: Examples.Event.tags,
    data: Examples.Event.data,
  },
});
type IngestInput = z.infer<typeof IngestInput>;

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
      validator("json", IngestInput),
      async (c) => {
        const body = c.req.valid("json");
        const resolved = await Event.Source.resolve(body);
        if (!resolved) {
          throw new VisibleError(
            "not_found",
            ErrorCodes.NotFound.RESOURCE_NOT_FOUND,
            `Source not found`,
          );
        }

        const id = await Event.create({
          id: body.id ?? undefined,
          source: resolved.source,
          sourceId: resolved.sourceId,
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
    .patch(
      "/:id",
      describeRoute({
        tags: ["Event"],
        summary: "Update event",
        description: "Update data and/or tags on an existing event.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(Event.Info),
                example: Examples.Event,
              },
            },
            description: "The updated event.",
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
      validator(
        "json",
        z.object({
          data: Event.Info.shape.data.optional(),
          tags: Event.Info.shape.tags.optional(),
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
        const body = c.req.valid("json");
        await Event.update(id, { data: body.data, tags: body.tags });
        return c.json((await Event.fromID(id))!, 200);
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
