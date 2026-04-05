import { describe, expect, it } from "bun:test";
import { buildSummaryBody } from "../src/body/summary";
import { COMMENT_MARKER, type ResultsData } from "../src/types";

const baseResults: ResultsData = {
  agent: {
    name: "claude-code",
    sessionId: "sess-123",
    status: "success",
    metrics: {
      tokens: {
        input: 5000,
        output: 2000,
        reasoning: null,
        cache_read: 1000,
        cache_creation: 500,
      },
      turns: 3,
      cost_usd: 0.043,
      model: "claude-sonnet-4-6",
    },
    pricing: {
      heuristic: "models-dev",
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
      cost_usd: 0.043,
    },
  },
  diff: { linesAdded: 120, linesRemoved: 30 },
  pr: { url: "https://github.com/org/repo/pull/99", number: 99 },
  checks: {
    lint: { oxlint: { outcome: "success" } },
    typecheck: { tsc: { outcome: "success" } },
    tests: { unit: { outcome: "success" } },
  },
};

const baseParams = {
  results: baseResults,
  existingBody: null as string | null,
  runUrl: "https://github.com/org/repo/actions/runs/123",
  consoleUrl: "https://console.agents.developing.company",
  eventId: "evt-abc",
};

describe("buildSummaryBody", () => {
  it("contains the comment marker", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain(COMMENT_MARKER);
  });

  it("contains the heading", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("## Agent Run Summary");
  });

  it("contains the agent name and model", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("claude-code");
    expect(body).toContain("claude-sonnet-4-6");
  });

  it("contains cost", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("$0.04");
  });

  it("contains lines changed", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("+120 -30");
  });

  it("contains success emoji", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain(":white_check_mark:");
  });

  it("contains token breakdown", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("Token breakdown");
    expect(body).toContain("5,000");
  });

  it("contains checks section", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("Checks (3/3 passed)");
  });

  it("contains footer links", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).toContain("[View run]");
    expect(body).toContain("[PR](https://github.com/org/repo/pull/99)");
    expect(body).toContain("[Console](https://console.agents.developing.company/events/evt-abc)");
  });

  it("does not show Total row for single run", () => {
    const body = buildSummaryBody(baseParams);
    expect(body).not.toContain("**Total**");
  });

  it("shows Total row for multiple runs", () => {
    const firstBody = buildSummaryBody(baseParams);
    const secondBody = buildSummaryBody({
      ...baseParams,
      existingBody: firstBody,
    });
    expect(secondBody).toContain("**Total**");
  });

  it("prepends newest run first", () => {
    const firstBody = buildSummaryBody({
      ...baseParams,
      results: {
        ...baseResults,
        agent: { ...baseResults.agent!, name: "first-agent" },
      },
    });
    const secondBody = buildSummaryBody({
      ...baseParams,
      existingBody: firstBody,
      results: {
        ...baseResults,
        agent: { ...baseResults.agent!, name: "second-agent" },
      },
    });

    const firstIdx = secondBody.indexOf("second-agent");
    const secondIdx = secondBody.indexOf("first-agent");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("shows collapsible when over 5 runs", () => {
    let body: string | null = null;
    for (let i = 1; i <= 6; i++) {
      body = buildSummaryBody({
        ...baseParams,
        existingBody: body,
        results: {
          ...baseResults,
          agent: { ...baseResults.agent!, name: `run-${i}` },
        },
      });
    }
    expect(body).toContain("All 6 runs");
    // Main table should not contain run-1 (oldest, 6th)
    const mainSection = body!.split("<details>")[0]!;
    expect(mainSection).toContain("run-6");
    expect(mainSection).toContain("run-2");
    expect(mainSection).not.toContain("run-1");
  });

  it("gracefully handles missing agent data", () => {
    const body = buildSummaryBody({
      ...baseParams,
      results: { agent: null, diff: null, pr: null, checks: null },
    });
    expect(body).toContain(COMMENT_MARKER);
    expect(body).toContain("agent");
    expect(body).not.toContain("Token breakdown");
    expect(body).not.toContain("Checks");
  });

  it("omits console link when no eventId", () => {
    const body = buildSummaryBody({ ...baseParams, eventId: null });
    expect(body).not.toContain("[Console]");
  });

  it("omits PR link when no PR data", () => {
    const body = buildSummaryBody({
      ...baseParams,
      results: { ...baseResults, pr: null },
    });
    expect(body).not.toContain("[PR]");
  });
});
