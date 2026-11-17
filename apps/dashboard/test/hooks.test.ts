import { describe, expect, it } from "bun:test";
import { handleError } from "../src/hooks/server/error";
import { VisibleError } from "@agents/core/error";

const event = { url: new URL("http://localhost/issues") };
const call = (error: unknown, kind = "unknown") =>
  handleError({ kind, error, event } as Parameters<typeof handleError>[0]);

describe("handleError", () => {
  it("passes kit's own errors through", () => {
    const err = { status: 404, message: "Not Found" };
    expect(call(err, "framework")).toEqual(err);
  });

  it("surfaces a VisibleError message and code", () => {
    const err = new VisibleError("not_found", "issue_not_found", "Issue not found");
    expect(call(err)).toEqual({ message: "Issue not found", code: "issue_not_found" });
  });

  it("hides unexpected Error details in production", () => {
    expect(call(new Error("stack trace"))).toEqual({
      message: "An unexpected error occurred.",
    });
  });

  it("hides non-Error throws in production", () => {
    expect(call("kaboom")).toEqual({ message: "An unexpected error occurred." });
  });
});
