import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import type { RequestHandler } from "./$types";
import { Repository } from "@agents/core/repository";
import { Plan } from "@agents/core/events/plan";
import { createModel } from "$lib/agents/ai/model";
import { gitTools } from "$lib/agents/ai/tools/git-tools";
import { planTools } from "$lib/agents/ai/tools/plan-tools";
import { triageTools } from "$lib/agents/ai/tools/triage-tools";
import { askUserTool } from "$lib/agents/ai/tools/ask-user-tool";

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
  if (locals.actor.type !== "account") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, planId }: { messages: UIMessage[]; planId?: string } = await request.json();
  const { org, repo: repoName } = params;

  const repoEntity = await Repository.findByFullName(`${org}/${repoName}`);
  if (!repoEntity) {
    return new Response("Repository not found", { status: 404 });
  }

  const repoCtx = {
    source: repoEntity.source,
    fullName: repoEntity.fullName,
  };

  const entityCtx = {
    owner: org,
    repo: repoName,
    repoEntityId: repoEntity.id,
  };

  const existingPlan = planId ? await Plan.fromID(planId) : undefined;

  const draftPrompt = `You are a development planner for the ${org}/${repoName} repository.
Your job is to help triage issues, draft plans, and manage the issue→plan pipeline.

You are in DRAFT mode — no plan exists yet. Help the user create one.
When asked to create a plan, read relevant issues and repo structure first, then create a well-structured plan.

Plans should have these markdown sections:
## Scope
## Files
## Acceptance Criteria

Be concise and actionable. Use the tools available to you to gather context before making decisions.
When you need clarification, use the askUser tool — it accepts an array of 1-4 questions you can ask in a single panel. Each question has a short \`header\` (~12 chars), the full \`question\`, optional \`options\` for multiple choice, and optional \`multiSelect: true\` when choices are not mutually exclusive. Batch related questions together instead of asking one at a time. Use \`context\` for ASCII diagrams or tables that help illustrate the questions.`;

  const editPrompt = `You are a development planner for the ${org}/${repoName} repository.
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
Be concise and actionable. When you need clarification, use the askUser tool — it accepts an array of 1-4 questions you can ask in a single panel. Each question has a short \`header\` (~12 chars), the full \`question\`, optional \`options\` for multiple choice, and optional \`multiSelect: true\` when choices are not mutually exclusive. Batch related questions together instead of asking one at a time. Use \`context\` for ASCII diagrams or tables that help illustrate the questions.`;

  const result = streamText({
    model: createModel(platform?.env?.ANTHROPIC_API_KEY, "claude-haiku-4-5-20251001"),
    system: existingPlan ? editPrompt : draftPrompt,
    messages: await convertToModelMessages(messages),
    tools: {
      ...gitTools(repoCtx),
      ...planTools(entityCtx),
      ...triageTools(entityCtx),
      askUser: askUserTool,
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
};
