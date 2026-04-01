import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { redirect } from "@sveltejs/kit";
import { Repository } from "@agents/core/repository/index";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubContent } from "@agents/core/github/repo/content";
import { GitHub } from "@agents/core/github/client";
import { Plan } from "@agents/core/plan/index";
import { Event } from "@agents/core/events/index";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
  if (!locals.userID) throw redirect(302, "/");

  const { messages }: { messages: UIMessage[] } = await request.json();
  const { organization, repo: repoName } = params;

  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) {
    return new Response("Repository not found", { status: 404 });
  }

  const repoRef = {
    installationId: repo.installationId,
    owner: repo.owner,
    repo: repo.repo,
  };

  const apiKey =
    (platform as any)?.env?.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  const anthropic = createAnthropic({ apiKey });

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: `You are a development planner for the ${organization}/${repoName} repository.
Your job is to help triage issues, draft plans, and manage the issue→plan pipeline.
When asked to triage, read the issue, classify it, and record the triage result.
When asked to create a plan, read relevant issues and repo structure first, then create a well-structured plan.
Plans should have: ## Scope, ## Files, ## Acceptance Criteria sections.`,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      listIssues: tool({
        description: "List issues for this repository",
        parameters: z.object({
          state: z
            .enum(["open", "closed", "all"])
            .default("open")
            .describe("Filter by issue state"),
          labels: z.array(z.string()).optional().describe("Filter by label names"),
        }),
        execute: async ({ state, labels }) => {
          const issues = await GithubIssue.list(repoRef);
          return issues
            .filter((i) => state === "all" || i.state === state)
            .filter(
              (i) => !labels?.length || labels.some((l) => i.labels.includes(l)),
            );
        },
      }),

      getIssue: tool({
        description:
          "Get full details of a specific issue including body and comments",
        parameters: z.object({
          number: z.number().describe("Issue number"),
        }),
        execute: async ({ number }) => {
          return GithubIssue.get(repoRef, number);
        },
      }),

      labelIssue: tool({
        description: "Add or remove labels on an issue (e.g. type:bug, scope:small)",
        parameters: z.object({
          number: z.number().describe("Issue number"),
          add: z.array(z.string()).optional().describe("Labels to add"),
          remove: z.array(z.string()).optional().describe("Labels to remove"),
        }),
        execute: async ({ number, add, remove }) => {
          const octokit = await GitHub.appClient(repoRef.installationId);
          if (add?.length) {
            await octokit.rest.issues.addLabels({
              owner: repoRef.owner,
              repo: repoRef.repo,
              issue_number: number,
              labels: add,
            });
          }
          if (remove?.length) {
            for (const label of remove) {
              await octokit.rest.issues
                .removeLabel({
                  owner: repoRef.owner,
                  repo: repoRef.repo,
                  issue_number: number,
                  name: label,
                })
                .catch(() => {});
            }
          }
          return { issueNumber: number, added: add ?? [], removed: remove ?? [] };
        },
      }),

      createPlan: tool({
        description:
          "Create a new plan/PRD linking issues with scope, files, and acceptance criteria",
        parameters: z.object({
          title: z.string().describe("Plan title"),
          body: z
            .string()
            .describe(
              "Markdown with ## Scope, ## Files, ## Acceptance Criteria sections",
            ),
          issueNumbers: z
            .array(z.number())
            .describe("GitHub issue numbers this plan addresses"),
          tags: z.array(z.string()).optional().describe("Additional tags"),
        }),
        execute: async ({ title, body, issueNumbers, tags }) => {
          const issueTags = issueNumbers.map((n) => `gh:issue:${n}`);
          const id = await Plan.create({
            title,
            body,
            authorType: "llm",
            tags: [
              `gh:repo:${repo.fullName}`,
              ...issueTags,
              ...(tags ?? []),
            ],
            source: "repository",
            sourceId: repo.id,
          });
          return { id, title };
        },
      }),

      updatePlan: tool({
        description: "Update an existing plan's body, status, or tags",
        parameters: z.object({
          id: z.string().describe("Plan ID"),
          title: z.string().optional(),
          body: z.string().optional(),
          status: z
            .enum(["draft", "review", "approved", "rejected"])
            .optional(),
          tags: z.array(z.string()).optional(),
        }),
        execute: async ({ id, ...updates }) => {
          await Plan.update(id, updates);
          return { id, updated: Object.keys(updates) };
        },
      }),

      listPlans: tool({
        description: "List existing plans for this repository",
        parameters: z.object({
          status: z
            .enum([
              "draft",
              "review",
              "approved",
              "implementing",
              "completed",
              "rejected",
            ])
            .optional()
            .describe("Filter by plan status"),
        }),
        execute: async ({ status }) => {
          return Plan.list({
            source: "repository",
            sourceId: repo.id,
            status: status as any,
          });
        },
      }),

      getRepoTree: tool({
        description:
          "Get the repository file tree structure for understanding codebase layout",
        parameters: z.object({
          path: z
            .string()
            .optional()
            .describe("Subdirectory path, or empty for full tree"),
        }),
        execute: async ({ path }) => {
          if (path) {
            return GithubContent.listDir(repoRef, path);
          }
          const entries = await GithubContent.getTree(repoRef);
          return entries.filter((e) => e.type === "blob").slice(0, 200);
        },
      }),

      readFile: tool({
        description: "Read a file from the repository",
        parameters: z.object({
          path: z.string().describe("File path relative to repository root"),
        }),
        execute: async ({ path }) => {
          const content = await GithubContent.readFile(repoRef, path);
          if (!content) return { error: "File not found" };
          return { path, content: content.slice(0, 8000) };
        },
      }),

      triageIssue: tool({
        description:
          "Record a triage result for an issue (classification, scope, actionability). Call this after analyzing an issue.",
        parameters: z.object({
          issueNumber: z.number(),
          type: z.enum(["bug", "feature", "task", "question"]),
          scope: z.enum(["trivial", "small", "medium", "large"]),
          actionable: z.boolean(),
          reasoning: z.string().describe("Brief explanation of classification"),
        }),
        execute: async ({ issueNumber, type, scope, actionable, reasoning }) => {
          await Event.create({
            type: "issue.triaged",
            origin: "console",
            tags: [
              `gh:repo:${repo.fullName}`,
              `gh:issue:${issueNumber}`,
              `type:${type}`,
              `scope:${scope}`,
            ],
            data: { type, scope, actionable, reasoning },
            source: "repository",
            sourceId: repo.id,
          });
          return { issueNumber, type, scope, actionable };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
};
