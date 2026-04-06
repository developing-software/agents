import { describe, expect, it } from "bun:test";
import { buildChecksSection, buildTokenBreakdown } from "../src/body/sections";
import type { AgentData } from "../src/types";

const baseAgent: AgentData = {
  name: "claude-code",
  sessionId: null,
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
};

describe("buildTokenBreakdown", () => {
  it("returns null when no metrics", () => {
    expect(buildTokenBreakdown({ ...baseAgent, metrics: null })).toBeNull();
  });

  it("returns null when all tokens are zero", () => {
    const agent: AgentData = {
      ...baseAgent,
      metrics: {
        ...baseAgent.metrics!,
        tokens: { input: 0, output: 0, reasoning: null, cache_read: 0, cache_creation: 0 },
      },
    };
    expect(buildTokenBreakdown(agent)).toBeNull();
  });

  it("contains collapsible details element", () => {
    const result = buildTokenBreakdown(baseAgent)!;
    expect(result).toContain("<details>");
    expect(result).toContain("Token breakdown");
    expect(result).toContain("</details>");
  });

  it("contains token counts", () => {
    const result = buildTokenBreakdown(baseAgent)!;
    expect(result).toContain("5,000");
    expect(result).toContain("2,000");
    expect(result).toContain("1,000");
    expect(result).toContain("500");
  });

  it("shows model and turns", () => {
    const result = buildTokenBreakdown(baseAgent)!;
    expect(result).toContain("claude-sonnet-4-6");
    expect(result).toContain("3 turns");
  });

  it("calculates cache hit rate", () => {
    // 1000 / (1000 + 500 + 5000) = 1000 / 6500 ≈ 15%
    const result = buildTokenBreakdown(baseAgent)!;
    expect(result).toContain("15% cache hit rate");
  });

  it("does not show cache hit rate when cache reads are 0", () => {
    const agent: AgentData = {
      ...baseAgent,
      metrics: {
        ...baseAgent.metrics!,
        tokens: { input: 1000, output: 500, reasoning: null, cache_read: 0, cache_creation: 0 },
      },
    };
    const result = buildTokenBreakdown(agent)!;
    expect(result).not.toContain("cache hit rate");
  });

  it("shows --- for cost when no pricing", () => {
    const agent: AgentData = { ...baseAgent, pricing: null };
    const result = buildTokenBreakdown(agent)!;
    expect(result).toContain("---");
  });

  it("shows pricing source", () => {
    const result = buildTokenBreakdown(baseAgent)!;
    expect(result).toContain("Pricing: models-dev (anthropic)");
  });
});

describe("buildChecksSection", () => {
  it("returns null for empty checks", () => {
    expect(buildChecksSection({})).toBeNull();
  });

  it("builds checks table with pass/fail", () => {
    const result = buildChecksSection({
      lint: { oxlint: { outcome: "success" } },
      tests: { unit: { outcome: "failure" } },
    })!;

    expect(result).toContain("<details>");
    expect(result).toContain("Checks (1/2 passed)");
    expect(result).toContain("lint/oxlint");
    expect(result).toContain(":white_check_mark: pass");
    expect(result).toContain("tests/unit");
    expect(result).toContain(":x: fail");
  });

  it("shows all passed", () => {
    const result = buildChecksSection({
      lint: { oxlint: { outcome: "success" } },
      typecheck: { tsc: { outcome: "success" } },
      tests: { unit: { outcome: "success" } },
    })!;

    expect(result).toContain("Checks (3/3 passed)");
  });
});
