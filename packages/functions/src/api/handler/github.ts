import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { verifyAndReceive } from "@agents/core/git/provider/github";
import { AgentWorkflow } from "@agents/core/agent";
import { authRequired, validator, Result, ErrorResponses } from "../common";

const DispatchInput = z
  .object({
    owner: z.string().meta({ description: "Repository owner", example: "my-org" }),
    repo: z.string().meta({ description: "Repository name", example: "my-repo" }),
    agent: z.enum(AgentWorkflow.Agents).meta({
      description: "Agent to dispatch",
    }),
    prompt: z.string().optional().meta({
      description: "Task/instructions for the agent. Required if issue_number is not provided.",
    }),
    issue_number: z.number().int().positive().optional().meta({
      description:
        "Issue number to implement. Auto-fetches title/body to build prompt and adds gh:issue tag.",
    }),
    tags: z.array(z.string()).optional().meta({
      description: "Additional tags for event linking (e.g. gh:issue:42)",
    }),
    model: z.string().optional().meta({
      description: "Model override",
    }),
    ref: z.string().default("dev").meta({
      description: "Git ref to dispatch on",
    }),
  })
  .refine((d) => d.prompt || d.issue_number, {
    message: "Either prompt or issue_number is required",
  });

export namespace GitHubApi {
  export const route = new Hono()
    .post("/webhook", async (c) => {
      const id = c.req.header("x-github-delivery");
      const name = c.req.header("x-github-event");
      const signature = c.req.header("x-hub-signature-256");

      if (!id || !name || !signature) {
        return c.json({ ok: false, message: "Missing required GitHub webhook headers" }, 400);
      }

      const rawBody = await c.req.text();
      try {
        await verifyAndReceive({ id, name, rawBody, signature });
      } catch (err) {
        console.error("github webhook failed", {
          id,
          name,
          err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        });
        throw err;
      }
      return c.json({ ok: true }, 200);
    })
    .post(
      "/dispatch",
      describeRoute({
        tags: ["GitHub"],
        summary: "Dispatch agent workflow",
        description:
          "Trigger an agent workflow via GitHub Actions workflow_dispatch. Accepts either a direct prompt or an issue number (which auto-fetches the issue to build the prompt).",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(z.object({ ok: z.boolean() })),
              },
            },
            description: "Workflow dispatched successfully.",
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

        await AgentWorkflow.dispatch({
          owner: body.owner,
          repo: body.repo,
          agent: body.agent,
          prompt: body.prompt,
          issueNumber: body.issue_number,
          tags: body.tags,
          model: body.model,
          ref: body.ref,
        });

        return c.json({ ok: true }, 200);
      },
    );
}
