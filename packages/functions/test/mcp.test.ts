import { beforeAll, describe, expect, it, mock } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Key } from "@agents/core/key";
import { Issue } from "@agents/core/issue";
import { app } from "../src/mcp";
import { createUser } from "./api/util";

let token: string;

async function connect() {
  const transport = new StreamableHTTPClientTransport(new URL("http://mcp.internal/mcp"), {
    fetch: (url, init) => Promise.resolve(app.request(String(url), init)),
    requestInit: { headers: { authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

/** A tool result is always one JSON text block — `text()` in mcp/common.ts puts it there. */
function read(result: unknown) {
  return JSON.parse((result as { content: { text: string }[] }).content[0]!.text);
}

describe("mcp", () => {
  beforeAll(async () => {
    console.log = mock();
    const { id: userID } = await createUser({
      name: "Test User",
      email: `test-${crypto.randomUUID()}@example.com`,
    });
    token = (await Key.mint({ userID, name: "test" })).key;
  });

  it("lists issue tools", async () => {
    const client = await connect();
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);
    expect(names).toContain("issue_list");
    expect(names).toContain("issue_create");
    expect(names).toContain("feedback_create");
    await client.close();
  });

  it("files feedback through a tool", async () => {
    const client = await connect();
    const result = await client.callTool({
      name: "feedback_create",
      arguments: { body: "The MCP server works nicely", tag: "feature" },
    });
    expect(read(result)).toMatchObject({ title: "The MCP server works nicely", tag: "feature" });
    await client.close();
  });

  it("creates and lists issues through tools", async () => {
    const client = await connect();
    await client.callTool({ name: "issue_create", arguments: { title: "From MCP" } });
    const result = await client.callTool({ name: "issue_list", arguments: {} });
    const content = result.content as { type: string; text: string }[];
    expect(content[0]?.text).toContain("From MCP");
    await client.close();
  });

  // The point of `tools()`: a tool cannot document itself differently from the core op it
  // wraps, because it never gets to write its own prose.
  it("documents every tool from its core op", async () => {
    const client = await connect();
    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.title, `${tool.name} has no title`).toBeTruthy();
      expect(tool.description, `${tool.name} has no description`).toBeTruthy();
    }

    const list = tools.find((tool) => tool.name === "issue_list")!;
    expect(list.title).toBe(Issue.list.meta.title);
    expect(list.description).toBe(Issue.list.meta.description);

    const stages = tools.find((tool) => tool.name === "issue_stages")!;
    expect(stages.title).toBe(Issue.stages.meta.title);
    expect(stages.description).toBe(Issue.stages.meta.description);
    await client.close();
  });

  it("takes its input schema from the core op", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const list = tools.find((tool) => tool.name === "issue_list")!;

    // Reached only by deriving from `Issue.list.schema` — the old hand-written shape had neither.
    expect(Object.keys(list.inputSchema.properties ?? {})).toEqual(
      expect.arrayContaining(["sort", "createdBy"]),
    );
    // A field description written once in core, not restated on the tool.
    const props = list.inputSchema.properties as Record<string, { description?: string }>;
    expect(props.assignee?.description).toBe('A user id, or "none" for unassigned.');
    await client.close();
  });

  it("fetches and removes by bare id", async () => {
    const client = await connect();
    const made = read(
      await client.callTool({ name: "issue_create", arguments: { title: "By id" } }),
    );

    const got = read(await client.callTool({ name: "issue_get", arguments: { id: made.id } }));
    expect(got.title).toBe("By id");

    expect(read(await client.callTool({ name: "issue_remove", arguments: { id: made.id } }))).toBe(
      "ok",
    );
    expect(
      read(await client.callTool({ name: "issue_get", arguments: { id: made.id } })),
    ).toBeNull();
    await client.close();
  });

  it("reports the updated issue rather than the update's own return", async () => {
    const client = await connect();
    const made = read(
      await client.callTool({ name: "issue_create", arguments: { title: "Before" } }),
    );

    const after = read(
      await client.callTool({
        name: "issue_update",
        arguments: { id: made.id, title: "After", status: "active" },
      }),
    );
    expect(after.title).toBe("After");
    expect(after.status).toBe("active");
    await client.close();
  });

  it("reports the stages a rename left behind", async () => {
    const client = await connect();
    await client.callTool({
      name: "issue_create",
      arguments: { title: "Staged", stage: "alpha", source: "test", sourceID: "rename" },
    });

    const stages = read(
      await client.callTool({
        name: "issue_rename_stage",
        arguments: { from: "alpha", to: "beta", source: "test", sourceID: "rename" },
      }),
    );
    expect(stages.map((stage: { name: string }) => stage.name)).toEqual(["beta"]);
    await client.close();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.request("/mcp", {
      method: "post",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
    });
    expect(res.status).toBe(401);
  });
});
