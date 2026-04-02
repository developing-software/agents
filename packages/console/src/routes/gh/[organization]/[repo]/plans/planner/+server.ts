import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import type { RequestHandler } from "./$types";
import { Repository } from "@agents/core/repository/index";
import { Plan } from "@agents/core/plan/index";
import { createModel } from "$lib/ai/model";
import { githubTools } from "$lib/ai/tools/github-tools";
import { planTools } from "$lib/ai/tools/plan-tools";
import { triageTools } from "$lib/ai/tools/triage-tools";
import { askUserTool } from "$lib/ai/tools/ask-user-tool";

export const POST: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.userID) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, planId }: { messages: UIMessage[]; planId?: string } = await request.json();
  const { organization, repo: repoName } = params;

  const repoEntity = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repoEntity) {
    return new Response("Repository not found", { status: 404 });
  }

  const repoCtx = {
    installationId: repoEntity.installationId,
    owner: organization,
    repo: repoName,
  };

  const entityCtx = {
    owner: organization,
    repo: repoName,
    repoEntityId: repoEntity.id,
  };

  const existingPlan = planId ? await Plan.fromID(planId) : undefined;

  const draftPrompt = `You are a development planner for the ${organization}/${repoName} repository.
Your job is to help triage issues, draft plans, and manage the issue→plan pipeline.

You are in DRAFT mode — no plan exists yet. Help the user create one.
When asked to create a plan, read relevant issues and repo structure first, then create a well-structured plan.

Plans should have these markdown sections:
## Scope
## Files
## Acceptance Criteria

Be concise and actionable. Use the tools available to you to gather context before making decisions.
When you need clarification, use the askUser tool to present options or ask questions — include ASCII diagrams or tables when they help illustrate the question.`;

  const editPrompt = `You are a development planner for the ${organization}/${repoName} repository.
You are in EDIT mode for an existing plan.

Current plan:
- ID: ${existingPlan?.id}
- Title: ${existingPlan?.title}
- Status: ${existingPlan?.status}
- Tags: ${existingPlan?.tags?.join(", ")}

Current plan body:
${existingPlan?.body}

Help the user refine this plan — add issues, update scope, adjust acceptance criteria, or change status.
Use the updatePlan tool to save changes. When updating the body, include all existing content plus your changes.
Be concise and actionable. Use askUser when you need clarification — include ASCII diagrams or tables when they help.`;

  const result = streamText({
    model: createModel(),
    system: existingPlan ? editPrompt : draftPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      ...githubTools(repoCtx),
      ...planTools(entityCtx),
      ...triageTools(entityCtx),
      askUser: askUserTool,
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
};
