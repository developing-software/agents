import { describe, expect, it } from "bun:test";
import {
  formatCost,
  formatDuration,
  formatLines,
  formatNumber,
  formatTokenCost,
} from "../src/format";

describe("formatCost", () => {
  it("returns --- for null", () => {
    expect(formatCost(null)).toBe("---");
  });

  it("returns $0.00 for zero", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("uses 4 decimals for micro-costs", () => {
    expect(formatCost(0.0045)).toBe("$0.0045");
    expect(formatCost(0.0001)).toBe("$0.0001");
  });

  it("uses 2 decimals for normal costs", () => {
    expect(formatCost(0.01)).toBe("$0.01");
    expect(formatCost(4.52)).toBe("$4.52");
    expect(formatCost(12.5)).toBe("$12.50");
  });
});

describe("formatTokenCost", () => {
  it("returns --- for null", () => {
    expect(formatTokenCost(null)).toBe("---");
  });

  it("formats like formatCost", () => {
    expect(formatTokenCost(0)).toBe("$0.00");
    expect(formatTokenCost(0.003)).toBe("$0.0030");
    expect(formatTokenCost(0.15)).toBe("$0.15");
  });
});

describe("formatDuration", () => {
  it("returns --- for null", () => {
    expect(formatDuration(null)).toBe("---");
  });

  it("formats seconds under 60", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes", () => {
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(135)).toBe("2m 15s");
    expect(formatDuration(120)).toBe("2m");
  });
});

describe("formatNumber", () => {
  it("formats with commas", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(42318)).toBe("42,318");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });
});

describe("formatLines", () => {
  it("returns --- when both null", () => {
    expect(formatLines(null, null)).toBe("---");
  });

  it("formats added and removed", () => {
    expect(formatLines(120, 30)).toBe("+120 -30");
  });

  it("defaults null to 0", () => {
    expect(formatLines(50, null)).toBe("+50 -0");
    expect(formatLines(null, 10)).toBe("+0 -10");
  });
});
