import { describe, expect, it } from "bun:test";
import { parseExistingRuns } from "../src/body/history";

describe("parseExistingRuns", () => {
  it("returns empty array for empty body", () => {
    expect(parseExistingRuns("")).toEqual([]);
  });

  it("returns empty array for malformed body", () => {
    expect(parseExistingRuns("just some text")).toEqual([]);
  });

  it("parses a single run from the main table", () => {
    const body = [
      "<!-- dev-agents -->",
      "## Agent Run Summary",
      "",
      "| # | Agent | Model | Status | Cost | Duration | Lines |",
      "|---|-------|-------|--------|------|----------|-------|",
      "| 1 | claude-code | claude-sonnet-4-6 | :white_check_mark: | $0.04 | 2m 15s | +120 -30 |",
      "",
    ].join("\n");

    const runs = parseExistingRuns(body);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.agent).toBe("claude-code");
    expect(runs[0]!.model).toBe("claude-sonnet-4-6");
    expect(runs[0]!.status).toBe("success");
    expect(runs[0]!.costUsd).toBe(0.04);
    expect(runs[0]!.durationSeconds).toBe(135);
    expect(runs[0]!.linesAdded).toBe(120);
    expect(runs[0]!.linesRemoved).toBe(30);
  });

  it("parses multiple runs", () => {
    const body = [
      "<!-- dev-agents -->",
      "## Agent Run Summary",
      "",
      "| # | Agent | Model | Status | Cost | Duration | Lines |",
      "|---|-------|-------|--------|------|----------|-------|",
      "| 1 | claude-code | claude-sonnet-4-6 | :white_check_mark: | $0.04 | 2m | +50 -10 |",
      "| 2 | codex | o4-mini | :x: | $0.02 | 45s | +20 -5 |",
      "",
    ].join("\n");

    const runs = parseExistingRuns(body);
    expect(runs).toHaveLength(2);
    expect(runs[0]!.agent).toBe("claude-code");
    expect(runs[1]!.agent).toBe("codex");
    expect(runs[1]!.status).toBe("failure");
  });

  it("skips Total rows", () => {
    const body = [
      "<!-- dev-agents -->",
      "## Agent Run Summary",
      "",
      "| # | Agent | Model | Status | Cost | Duration | Lines |",
      "|---|-------|-------|--------|------|----------|-------|",
      "| 1 | claude-code | claude-sonnet-4-6 | :white_check_mark: | $0.04 | 2m | +50 -10 |",
      "| **Total** | | | | **$0.04** | | |",
      "",
    ].join("\n");

    const runs = parseExistingRuns(body);
    expect(runs).toHaveLength(1);
  });

  it("prefers collapsible All N runs section", () => {
    const body = [
      "<!-- dev-agents -->",
      "## Agent Run Summary",
      "",
      "| # | Agent | Model | Status | Cost | Duration | Lines |",
      "|---|-------|-------|--------|------|----------|-------|",
      "| 1 | run-6 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "| 2 | run-5 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "",
      "<details>",
      "<summary>All 6 runs</summary>",
      "",
      "| # | Agent | Model | Status | Cost | Duration | Lines |",
      "|---|-------|-------|--------|------|----------|-------|",
      "| 1 | run-6 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "| 2 | run-5 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "| 3 | run-4 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "| 4 | run-3 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "| 5 | run-2 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "| 6 | run-1 | m | :white_check_mark: | $0.01 | 1m | --- |",
      "",
      "</details>",
      "",
    ].join("\n");

    const runs = parseExistingRuns(body);
    expect(runs).toHaveLength(6);
    expect(runs[0]!.agent).toBe("run-6");
    expect(runs[5]!.agent).toBe("run-1");
  });

  it("handles --- for missing values", () => {
    const body = [
      "| # | Agent | Model | Status | Cost | Duration | Lines |",
      "|---|-------|-------|--------|------|----------|-------|",
      "| 1 | agent | --- | :white_check_mark: | --- | --- | --- |",
      "",
    ].join("\n");

    const runs = parseExistingRuns(body);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.model).toBeNull();
    expect(runs[0]!.costUsd).toBeNull();
    expect(runs[0]!.durationSeconds).toBeNull();
    expect(runs[0]!.linesAdded).toBeNull();
  });
});
