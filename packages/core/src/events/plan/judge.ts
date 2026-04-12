import { z } from "zod";
import type { Plan } from "./index";

export namespace PlanJudge {
  // -- Output schemas --

  export const ReviewScores = z.object({
    adherence: z
      .number()
      .describe("How well the implementation fulfills the plan requirements (1-10)"),
    quality: z.number().describe("Code quality, readability, and correctness (1-10)"),
    completeness: z
      .number()
      .describe("Coverage of plan requirements and test coverage (1-10)"),
  });
  export type ReviewScores = z.infer<typeof ReviewScores>;

  export const ReviewResult = z.object({
    agent: z.string().describe("Name of the agent that created the PR"),
    prNumber: z.number().describe("Pull request number"),
    scores: ReviewScores,
    verdict: z.string().describe("Concise overall assessment, 1-2 sentences"),
    suggestions: z
      .array(z.string().describe("An actionable improvement"))
      .optional()
      .describe("Up to 3 actionable improvements, if any"),
  });
  export type ReviewResult = z.infer<typeof ReviewResult>;

  export const CompareRanking = z.object({
    rank: z.number().describe("Rank position, 1 being the best"),
    agent: z.string().describe("Name of the agent"),
    prNumber: z.number().describe("Pull request number"),
    scores: ReviewScores,
    note: z.string().optional().describe("Brief note on this ranking"),
  });

  export const CompareResult = z.object({
    rankings: z.array(CompareRanking).describe("Implementations ranked from best to worst"),
    winner: z
      .object({
        agent: z.string().describe("Name of the winning agent"),
        prNumber: z.number().describe("Pull request number of the winning implementation"),
      })
      .describe("The recommended winner"),
    reasoning: z.string().describe("Explanation of the ranking decision"),
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
    plan: Plan.Info;
    agent: string;
    prNumber: number;
    diff: string;
    checks: CheckResult[];
    metrics: RunMetrics;
  }

  export interface CompareInput {
    plan: Plan.Info;
    reviews: ReviewResult[];
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
   * Plan-aware review prompt. Evaluates the PR against plan requirements
   * with dimensional scoring.
   */
  export function composeReviewPrompt(input: ReviewInput): string {
    const criteria = extractAcceptanceCriteria(input.plan.body);

    return `You are a senior code reviewer. Evaluate this pull request against the plan it implements.

## Plan: ${input.plan.title}

${input.plan.body}

${criteria ? `## Acceptance Criteria\n${criteria}` : ""}

## Implementation by ${input.agent} (PR #${input.prNumber})

### Metrics
${formatMetrics(input.metrics)}

### Check Results
${formatChecks(input.checks)}

### Diff
\`\`\`diff
${truncateDiff(input.diff)}
\`\`\`

## Instructions

Score this implementation on three dimensions (1-10 each):
- **adherence**: How well does this fulfill the plan requirements and acceptance criteria?
- **quality**: Code quality, readability, correctness, and potential bugs.
- **completeness**: Coverage of all plan requirements and test coverage based on check results.

Provide a concise verdict (1-2 sentences). Only include suggestions if there are clear, actionable improvements (max 3).`;
  }

  /**
   * Comparison prompt that synthesizes individual reviews to rank implementations.
   * Uses review data instead of re-reading diffs.
   */
  export function composeComparePrompt(input: CompareInput): string {
    const criteria = extractAcceptanceCriteria(input.plan.body);

    const reviewSections = input.reviews.map((r, i) => {
      const avg = ((r.scores.adherence + r.scores.quality + r.scores.completeness) / 3).toFixed(1);
      const suggestions = r.suggestions?.length ? `\nSuggestions: ${r.suggestions.join("; ")}` : "";
      return `### ${i + 1}. ${r.agent} (PR #${r.prNumber})
Scores: adherence=${r.scores.adherence}, quality=${r.scores.quality}, completeness=${r.scores.completeness} (avg ${avg})
Verdict: ${r.verdict}${suggestions}`;
    });

    return `You are a senior engineering lead comparing multiple implementations of the same plan. Rank them and pick a winner.

## Plan: ${input.plan.title}

${input.plan.body}

${criteria ? `## Acceptance Criteria\n${criteria}` : ""}

## Reviews

${reviewSections.join("\n\n")}

## Instructions

Based on the reviews above, rank the implementations and identify the winner. For each ranking, provide the three dimension scores and an optional brief note. Explain your reasoning concisely.`;
  }
}
