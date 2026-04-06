import { z } from "zod";
import type { Plan } from "./index";

export namespace PlanJudge {
  // -- Output schemas --

  export const ReviewResult = z.object({
    agent: z.string().describe("Name of the agent that created the PR"),
    prNumber: z.number().describe("Pull request number"),
    overallScore: z.number().describe("Score from 1 to 10"),
    summary: z.string().describe("Brief overall assessment of the implementation"),
    strengths: z.array(z.string().describe("A specific strength")).describe("List of strengths"),
    concerns: z
      .array(z.string().describe("A specific concern"))
      .describe("List of concerns or issues found"),
    suggestions: z
      .array(z.string().describe("An actionable suggestion"))
      .describe("List of actionable improvement suggestions"),
  });
  export type ReviewResult = z.infer<typeof ReviewResult>;

  export const CompareRanking = z.object({
    rank: z.number().describe("Rank position, 1 being the best"),
    agent: z.string().describe("Name of the agent"),
    prNumber: z.number().describe("Pull request number"),
    score: z.number().describe("Score from 1 to 10"),
    strengths: z
      .array(z.string().describe("A specific strength"))
      .describe("Key strengths of this implementation"),
    weaknesses: z
      .array(z.string().describe("A specific weakness"))
      .describe("Key weaknesses of this implementation"),
  });

  export const CompareResult = z.object({
    rankings: z.array(CompareRanking).describe("Implementations ranked from best to worst"),
    winner: z
      .object({
        agent: z.string().describe("Name of the winning agent"),
        prNumber: z.number().describe("Pull request number of the winning implementation"),
      })
      .describe("The recommended winner"),
    reasoning: z.string().describe("Detailed explanation of the ranking decision"),
  });
  export type CompareResult = z.infer<typeof CompareResult>;

  // -- Types for prompt inputs --

  export interface RunMetrics {
    cost_usd: number | null;
    durationMs: number | null;
    linesAdded: number | null;
    linesRemoved: number | null;
  }

  export interface CheckResult {
    category: string;
    name: string;
    outcome: string;
  }

  export interface ReviewInput {
    agent: string;
    prNumber: number;
    diff: string;
    checks: CheckResult[];
    metrics: RunMetrics;
  }

  export interface CompareInput {
    plan: Plan.Info;
    implementations: Array<ReviewInput>;
  }

  const MAX_DIFF_CHARS = 50_000;

  function truncateDiff(diff: string): string {
    if (diff.length <= MAX_DIFF_CHARS) return diff;
    return diff.slice(0, MAX_DIFF_CHARS) + "\n\n[... diff truncated at 50k characters ...]";
  }

  function formatChecks(checks: CheckResult[]): string {
    if (checks.length === 0) return "No check results available.";
    const passed = checks.filter((c) => c.outcome === "success").length;
    const failed = checks.length - passed;
    const lines = checks.map(
      (c) => `- ${c.category}/${c.name}: ${c.outcome === "success" ? "PASS" : "FAIL"}`,
    );
    return `${passed} passed, ${failed} failed:\n${lines.join("\n")}`;
  }

  function formatMetrics(m: RunMetrics): string {
    const parts: string[] = [];
    if (m.cost_usd != null) parts.push(`Cost: $${m.cost_usd.toFixed(3)}`);
    if (m.durationMs != null) parts.push(`Duration: ${(m.durationMs / 1000).toFixed(1)}s`);
    if (m.linesAdded != null) parts.push(`Lines added: +${m.linesAdded}`);
    if (m.linesRemoved != null) parts.push(`Lines removed: -${m.linesRemoved}`);
    return parts.length > 0 ? parts.join(" | ") : "No metrics available.";
  }

  function extractAcceptanceCriteria(body: string): string | null {
    const match = body.match(/## Acceptance Criteria\s*\n([\s\S]*?)(?=\n## |\n---|\Z)/i);
    return match?.[1]?.trim() ?? null;
  }

  /**
   * PR-focused review prompt. Evaluates code quality, correctness, and style.
   * No plan context injected.
   */
  export function composeReviewPrompt(input: ReviewInput): string {
    return `You are a senior code reviewer. Evaluate this pull request on its own merits.

Focus on:
- Code quality and readability
- Correctness and potential bugs
- Test coverage (based on check results)
- Style consistency
- Whether the diff is clean and well-structured

## Agent: ${input.agent}
## PR #${input.prNumber}

## Metrics
${formatMetrics(input.metrics)}

## Check Results
${formatChecks(input.checks)}

## Diff
\`\`\`diff
${truncateDiff(input.diff)}
\`\`\`

Provide a structured review with an overall score (1-10), summary, strengths, concerns, and actionable suggestions.`;
  }

  /**
   * Plan-aware comparison prompt. Evaluates all implementations against the plan
   * and acceptance criteria to pick a winner.
   */
  export function composeComparePrompt(input: CompareInput): string {
    const criteria = extractAcceptanceCriteria(input.plan.body);

    const implSections = input.implementations.map((impl, i) => {
      return `### Implementation ${i + 1}: ${impl.agent} (PR #${impl.prNumber})

#### Metrics
${formatMetrics(impl.metrics)}

#### Check Results
${formatChecks(impl.checks)}

#### Diff
\`\`\`diff
${truncateDiff(impl.diff)}
\`\`\``;
    });

    return `You are a senior engineering lead comparing multiple implementations of the same plan. Your job is to rank them and pick a winner.

## Plan: ${input.plan.title}

${input.plan.body}

${criteria ? `## Acceptance Criteria\n${criteria}` : ""}

## Implementations

${implSections.join("\n\n---\n\n")}

## Instructions

Compare the implementations against:
1. The plan requirements and acceptance criteria
2. Code quality and correctness
3. Test results (check outcomes)
4. Efficiency (cost, duration, lines changed)

Rank all implementations, identify the winner, and explain your reasoning. Be specific about strengths and weaknesses of each.`;
  }
}
