import { tool } from "ai";
import { z } from "zod";
import { Plan } from "@agents/core/plan/index";

export type PlanToolsContext = {
  owner: string;
  repo: string;
  repoEntityId: string;
};

export function planTools(ctx: PlanToolsContext) {
  return {
    createPlan: tool({
      description: "Create a new plan/PRD linking issues with scope, files, and acceptance criteria",
      inputSchema: z.object({
        title: z.string().describe("Plan title"),
        body: z.string().describe("Markdown body with ## Scope, ## Files, ## Acceptance Criteria sections"),
        issueNumbers: z.array(z.number()).describe("Related issue numbers"),
        tags: z.array(z.string()).optional().describe("Additional tags"),
      }),
      execute: async ({ title, body, issueNumbers, tags }) => {
        const issueTags = issueNumbers.map((n) => `gh:issue:${n}`);
        const id = await Plan.create({
          title,
          body,
          authorType: "llm",
          tags: [`gh:repo:${ctx.owner}/${ctx.repo}`, ...issueTags, ...(tags ?? [])],
          source: "repository",
          sourceId: ctx.repoEntityId,
        });
        return { id, title };
      },
    }),

    updatePlan: tool({
      description: "Update an existing plan's body, status, or tags",
      inputSchema: z.object({
        id: z.string().describe("Plan ID"),
        title: z.string().optional(),
        body: z.string().optional(),
        status: z.enum(["draft", "review", "approved", "rejected"]).optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async ({ id, ...input }) => {
        await Plan.update(id, input);
        return { id, updated: Object.keys(input) };
      },
    }),

    listPlans: tool({
      description: "List existing plans for this repository",
      inputSchema: z.object({
        status: z.enum(["draft", "review", "approved", "implementing", "completed", "rejected"]).optional(),
      }),
      execute: async ({ status }) => {
        return Plan.list({
          source: "repository",
          sourceId: ctx.repoEntityId,
          status,
        });
      },
    }),
  };
}
