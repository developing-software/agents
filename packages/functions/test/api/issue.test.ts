import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";
import { Issue } from "@agents/core/issue";
import { Identifier } from "@agents/core/identifier";
import { Examples } from "@agents/core/examples";

const { test, validateOpenAPIRoute, del } = setupApiTest();

describe("issue", () => {
  test("GET /issue", async () => {
    const response = await validateOpenAPIRoute("get", "/issue");
    expect(response.data).toBeArray();
  });

  test("GET /issue?from&to", async () => {
    const scope = { source: "project", sourceID: Identifier.create("project") };
    const span = await Issue.create({
      title: "Spans the window",
      startDate: "2026-05-20T00:00:00.000Z",
      dueDate: "2026-07-10T00:00:00.000Z",
      ...scope,
    });
    const due = await Issue.create({
      title: "Due inside",
      dueDate: "2026-06-15T12:00:00.000Z",
      ...scope,
    });
    await Issue.create({ title: "Due after", dueDate: "2026-07-02T00:00:00.000Z", ...scope });
    const undated = await Issue.create({ title: "Undated", ...scope });
    const range = {
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-30T23:59:59.999Z",
      ...scope,
    };
    const response = await validateOpenAPIRoute("get", "/issue", range);
    const ids = response.data.map((issue: { id: string }) => issue.id).sort();
    expect(ids).toEqual([span.id, due.id].sort());
    const loose = await validateOpenAPIRoute("get", "/issue", { unscheduled: "true", ...scope });
    expect(loose.data.map((issue: { id: string }) => issue.id)).toEqual([undated.id]);
  });

  test("GET /issue/stage", async () => {
    const response = await validateOpenAPIRoute("get", "/issue/stage");
    expect(response).toBeArray();
  });

  test("PATCH /issue/stage", async () => {
    const scope = { source: "project", sourceID: Identifier.create("project") };
    const { id } = await Issue.create({ title: "Staged", stage: "Draft", ...scope });
    await validateOpenAPIRoute("patch", "/issue/stage", undefined, {
      from: "Draft",
      to: "Review",
      ...scope,
    });
    expect((await Issue.fromID(id))!.stage).toBe("Review");
  });

  test("POST /issue", async () => {
    const response = await validateOpenAPIRoute("post", "/issue", undefined, {
      title: Examples.Issue.title,
    });
    const created = await Issue.fromID(response.id);
    expect(created).toBeDefined();
    expect(created!.title).toBe(Examples.Issue.title);
    expect(created!.status).toBe("backlog");
  });

  test("GET /issue/:id", async () => {
    const { id } = await Issue.create({ title: "Fetch me" });
    const response = await validateOpenAPIRoute("get", "/issue/:id", { id });
    expect(response.id).toBe(id);
  });

  test("PATCH /issue/:id", async () => {
    const { id } = await Issue.create({ title: "Mark done" });
    const response = await validateOpenAPIRoute(
      "patch",
      "/issue/:id",
      { id },
      { status: "active" },
    );
    expect(response.status).toBe("active");
    expect(response.timeStarted).not.toBeNull();
  });

  test("POST /issue/:id/link", async () => {
    const { id } = await Issue.create({ title: "Linked" });
    const response = await validateOpenAPIRoute(
      "post",
      "/issue/:id/link",
      { id },
      { url: "https://example.com", title: "Example" },
    );
    expect(response.metadata.links).toEqual([{ url: "https://example.com", title: "Example" }]);
  });

  test("DELETE /issue/:id/link", async () => {
    const { id } = await Issue.create({ title: "Unlinked" });
    await Issue.link({ id, url: "https://example.com" });
    const response = await validateOpenAPIRoute("delete", "/issue/:id/link", {
      id,
      url: "https://example.com",
    });
    expect(response.metadata.links).toEqual([]);
    // No body to break, so the declared 400 is driven by a missing `url`.
    expect((await del(`/issue/${id}/link`)).status).toBe(400);
  });

  test("DELETE /issue/:id", async () => {
    const { id } = await Issue.create({ title: "Temporary" });
    await validateOpenAPIRoute("delete", "/issue/:id", { id });
    const deleted = await Issue.fromID(id);
    expect(deleted).toBeNull();
  });
});
