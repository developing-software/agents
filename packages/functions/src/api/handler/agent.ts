import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { AgentDispatch } from "@agents/core/agent";
import { Event } from "@agents/core/events";
import { authRequired, validator, Result, ErrorResponses } from "../common";

const DispatchInput = z
  .object({
    owner: z.string().meta({ description: "Repository owner", example: "my-org" }),
    repo: z.string().meta({ description: "Repository name", example: "my-repo" }),
    agent: z.enum(AgentDispatch.Agents).meta({
      description: "Agent to dispatch",
    }),
    prompt: z.string().optional().meta({
      description: "Task/instructions for the agent. Required if issue_number is not provided.",
    }),
    issue_number: z.number().int().positive().optional().meta({
      description:
        "Issue number to implement. Auto-fetches title/body to build prompt and adds git:issue tag.",
    }),
    tags: z.array(z.string()).optional().meta({
      description: "Additional tags for event linking (e.g. plan:pln_...)",
    }),
    model: z.string().optional().meta({
      description: "Model override (LiteLLM model name)",
    }),
    base_branch: z.string().optional().meta({
      description: "Branch to clone from (default: repository default branch)",
    }),
    branch: z.string().optional().meta({
      description: "Existing branch to work on, e.g. an open PR's head branch",
    }),
  })
  .refine((d) => d.prompt || d.issue_number, {
    message: "Either prompt or issue_number is required",
  });

const DispatchResult = z
  .object({
    eventId: z.string(),
    sandboxId: z.string(),
    branch: z.string(),
  })
  .meta({ ref: "AgentDispatchResult" });

const RunParam = z.object({
  id: Event.Info.shape.id.meta({ description: "Agent run event ID" }),
});

export namespace AgentApi {
  export const route = new Hono()
    .post(
      "/dispatch",
      describeRoute({
        tags: ["Agent"],
        summary: "Dispatch agent",
        description:
          "Run a coding agent on a repository in a sandboxd sandbox. Accepts either a direct prompt or an issue number (which auto-fetches the issue to build the prompt).",
        responses: {
          200: {
            content: { "application/json": { schema: Result(DispatchResult) } },
            description: "Agent run started.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("json", DispatchInput),
      async (c) => {
        const body = c.req.valid("json") as z.infer<typeof DispatchInput>;
        const result = await AgentDispatch.dispatch({
          owner: body.owner,
          repo: body.repo,
          agent: body.agent,
          prompt: body.prompt,
          issueNumber: body.issue_number,
          tags: body.tags,
          model: body.model,
          baseBranch: body.base_branch,
          branch: body.branch,
          origin: "api",
        });
        return c.json(result, 200);
      },
    )
    .post(
      "/runs/:id/finish",
      describeRoute({
        tags: ["Agent"],
        summary: "Finish agent run",
        description:
          "Called by the runner when the agent exits. Opens a pull request for a pushed branch and completes the agent event.",
        responses: {
          200: {
            content: { "application/json": { schema: Result(Event.Info) } },
            description: "The completed agent event.",
          },
          400: ErrorResponses[400],
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", RunParam),
      validator("json", AgentDispatch.FinishInput),
      async (c) => {
        const { id } = c.req.valid("param");
        const event = await AgentDispatch.finish(id, c.req.valid("json"));
        return c.json(event!, 200);
      },
    )
    .post(
      "/runs/:id/end",
      describeRoute({
        tags: ["Agent"],
        summary: "Stop agent run",
        description: "End the run's sandbox now.",
        responses: {
          200: {
            content: {
              "application/json": { schema: Result(z.object({ ok: z.boolean() })) },
            },
            description: "Sandbox told to stop.",
          },
          401: ErrorResponses[401],
          404: ErrorResponses[404],
          500: ErrorResponses[500],
        },
      }),
      authRequired,
      validator("param", RunParam),
      async (c) => {
        await AgentDispatch.end(c.req.valid("param").id);
        return c.json({ ok: true }, 200);
      },
    );
}
