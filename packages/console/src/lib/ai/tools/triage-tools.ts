import { tool } from "ai";
import { z } from "zod";
import { Event } from "@agents/core/events/index";

export type TriageContext = {
  owner: string;
  repo: string;
  repoEntityId: string;
};

export function triageTools(ctx: TriageContext) {
  return {
    triageIssue: tool({
      description:
        "Record a triage result for an issue. Call this after analyzing an issue to classify it.",
      inputSchema: z.object({
        issueNumber: z.number(),
        type: z.enum(["bug", "feature", "task", "question"]),
        scope: z.enum(["trivial", "small", "medium", "large"]),
        actionable: z.boolean(),
        reasoning: z.string().describe("Brief explanation of the classification"),
      }),
      execute: async ({ issueNumber, type, scope, actionable, reasoning }) => {
        await Event.create({
          type: "github.issue.triaged",
          tags: [
            `gh:repo:${ctx.owner}/${ctx.repo}`,
            `gh:issue:${issueNumber}`,
            `type:${type}`,
            `scope:${scope}`,
          ],
          data: { type, scope, actionable, reasoning },
          source: "repository",
          sourceId: ctx.repoEntityId,
          origin: "console",
        });
        return { issueNumber, type, scope, actionable };
      },
    }),
  };
}
