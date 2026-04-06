import { describe, expect, it } from "bun:test";
import { buildProgressBody } from "../src/body/progress";
import { COMMENT_MARKER } from "../src/types";

describe("buildProgressBody", () => {
  const base = {
    agent: "claude-code",
    model: "claude-sonnet-4-6",
    runUrl: "https://github.com/org/repo/actions/runs/123",
    branch: "claude/issue-42-123",
  };

  it("contains the comment marker", () => {
    expect(buildProgressBody(base)).toContain(COMMENT_MARKER);
  });

  it("contains the agent name", () => {
    expect(buildProgressBody(base)).toContain("claude-code");
  });

  it("contains the model", () => {
    expect(buildProgressBody(base)).toContain("claude-sonnet-4-6");
  });

  it("shows running status emoji", () => {
    expect(buildProgressBody(base)).toContain(":hourglass_flowing_sand:");
  });

  it("contains the run link", () => {
    expect(buildProgressBody(base)).toContain(
      "[View](https://github.com/org/repo/actions/runs/123)",
    );
  });

  it("contains the branch", () => {
    expect(buildProgressBody(base)).toContain("`claude/issue-42-123`");
  });

  it("shows --- for null model", () => {
    expect(buildProgressBody({ ...base, model: null })).toContain("| --- |");
  });

  it("omits branch when null", () => {
    const body = buildProgressBody({ ...base, branch: null });
    expect(body).not.toContain("Branch:");
  });

  it("contains in progress text", () => {
    expect(buildProgressBody(base)).toContain("_In progress..._");
  });
});
