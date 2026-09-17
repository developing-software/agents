import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Actor } from "../src/actor";
import { AgentDispatch } from "../src/agent/dispatch";
import { VisibleError } from "../src/error";
import { AgentEvent } from "../src/events/agent";
import { Sandbox } from "../src/sandbox";

const view = {
  id: "s_ab12cd34",
  owner_id: "wsp_1",
  status: "queued",
  host_id: null,
  host_online: null,
  queue_position: 1,
  ended_reason: null,
  ended_detail: null,
  image: "runner",
  cmd: [],
  env: {},
  tags: [],
  idle_timeout_s: 1800,
  created_at: 0,
  started_at: null,
  ended_at: null,
};

const realFetch = globalThis.fetch;
let requests: Request[] = [];

function respond(status: number, body: unknown) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

function asWorkspace<T>(fn: () => T) {
  return Actor.provide("system", { workspaceID: "wsp_1" }, fn);
}

describe("Sandbox", () => {
  beforeEach(() => {
    process.env.SANDBOXD_URL = "http://sandboxd.test";
    process.env.SANDBOXD_TOKEN = "svc-token";
    requests = [];
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("creates a sandbox owned by the workspace with the service token", async () => {
    respond(201, view);
    const sandbox = await asWorkspace(() => Sandbox.create({ image: "runner", env: { A: "1" } }));

    expect(sandbox.id).toBe("s_ab12cd34");
    const req = requests[0]!;
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/sandboxes");
    expect(req.headers.get("authorization")).toBe("Bearer svc-token");
    expect(req.headers.get("x-sandboxd-owner")).toBe("wsp_1");
    expect(await req.json()).toEqual({ image: "runner", env: { A: "1" } });
  });

  it("maps 404 to a not_found VisibleError", async () => {
    respond(404, { error: "no such sandbox" });
    const err = await asWorkspace(() => Sandbox.get("s_missing")).catch((e) => e);
    expect(err).toBeInstanceOf(VisibleError);
  });

  it("throws a raw Error for other failures", async () => {
    respond(500, { error: "boom" });
    const err = await asWorkspace(() => Sandbox.list()).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(VisibleError);
    expect(String(err.message)).toContain("boom");
  });

  it("fails fast when not configured", async () => {
    delete process.env.SANDBOXD_URL;
    expect(Sandbox.configured()).toBe(false);
    await expect(asWorkspace(() => Sandbox.list())).rejects.toThrow("not configured");
  });
});

describe("AgentDispatch.FinishInput", () => {
  it("applies defaults", () => {
    const parsed = AgentDispatch.FinishInput.parse({ status: "success" });
    expect(parsed).toMatchObject({ pushed: false, diff: null, metrics: null, durationMs: 0 });
  });

  it("rejects unknown status", () => {
    expect(AgentDispatch.FinishInput.safeParse({ status: "done" }).success).toBe(false);
  });
});

describe("AgentEvent run data", () => {
  it("parses run and tolerates legacy events without it", () => {
    const withRun = AgentEvent.Completed.parse({
      run: {
        provider: "sandboxd",
        id: "s_1",
        state: "running",
        endedReason: null,
        baseBranch: "main",
      },
    });
    expect(withRun.run?.state).toBe("running");

    const legacy = AgentEvent.Completed.parse({ workflow: { runUrl: "https://gh/run" } });
    expect(legacy.run).toBeUndefined();
    expect(legacy.workflow.runUrl).toBe("https://gh/run");
  });
});
