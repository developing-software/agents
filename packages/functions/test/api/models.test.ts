import { describe, expect } from "bun:test";
import { setupApiTest } from "./util";

const { test, get, post, noAuth, validateOpenAPIRoute } = setupApiTest();

describe("models", () => {
  test("GET /models/pricing", async () => {
    const response = await validateOpenAPIRoute("get", "/models/pricing");
    expect(response.models).toBeDefined();
    expect(typeof response.models).toBe("object");

    // Should have at least some models with pricing
    const keys = Object.keys(response.models);
    expect(keys.length).toBeGreaterThan(100);

    // Spot-check structure of a model entry
    const entry = Object.values(response.models)[0] as any;
    expect(entry).toBeDefined();
    expect(entry.model).toBeString();
    expect(entry.provider).toBeString();
    expect(entry.cost.input).toBeNumber();
    expect(entry.cost.output).toBeNumber();
  });

  test("GET /models/pricing/:modelId — exact match", async () => {
    const response = await validateOpenAPIRoute("get", "/models/pricing/:modelId", {
      modelId: "claude-sonnet-4-6",
      provider: "anthropic",
    });
    expect(response.pricing).not.toBeNull();
    expect(response.pricing.model).toBe("claude-sonnet-4-6");
    expect(response.pricing.provider).toBe("anthropic");
    expect(response.pricing.cost.input).toBe(3);
    expect(response.pricing.cost.output).toBe(15);
  });

  test("GET /models/pricing/:modelId — prefix match", async () => {
    const response = await validateOpenAPIRoute("get", "/models/pricing/:modelId", {
      modelId: "claude-sonnet-4-6-20260217",
      provider: "anthropic",
    });
    expect(response.pricing).not.toBeNull();
    expect(response.pricing.model).toInclude("claude-sonnet-4-6");
    expect(response.pricing.provider).toBe("anthropic");
  });

  test("GET /models/pricing/:modelId — unknown model returns null", async () => {
    const res = await get("/models/pricing/not-a-real-model-xyz");
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.pricing).toBeNull();
  });

  test("POST /models/cost — calculates cost", async () => {
    const response = await validateOpenAPIRoute("post", "/models/cost", undefined, {
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      tokens: {
        input: 1_000_000,
        output: 100_000,
        cacheRead: 500_000,
      },
    });
    expect(response.pricing).not.toBeNull();
    expect(response.pricing.model).toBe("claude-sonnet-4-6");
    expect(response.cost_usd).toBeNumber();
    // 1M * $3/1M + 100k * $15/1M + 500k * $0.3/1M = 3 + 1.5 + 0.15 = 4.65
    expect(response.cost_usd).toBeCloseTo(4.65, 2);
  });

  test("POST /models/cost — with reasoning tokens", async () => {
    const res = await post("/models/cost", {
      model: "claude-opus-4-6",
      tokens: {
        input: 500_000,
        output: 50_000,
        cacheRead: 200_000,
        cacheWrite: 100_000,
        reasoning: 0,
      },
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.pricing).not.toBeNull();
    expect(data.cost_usd).toBeNumber();
    expect(data.cost_usd).toBeGreaterThan(0);
  });

  test("POST /models/cost — unknown model returns null", async () => {
    const res = await post("/models/cost", {
      model: "not-a-real-model-xyz",
      tokens: { input: 1000, output: 500 },
    });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.pricing).toBeNull();
    expect(data.cost_usd).toBeNull();
  });

  test("POST /models/cost — rejects invalid body", async () => {
    const res = await post("/models/cost", {
      model: "claude-sonnet-4-6",
      tokens: { input: -1, output: 0 },
    });
    expect(res.status).toBe(400);
  });

  test("POST /models/cost — rejects missing tokens", async () => {
    const res = await post("/models/cost", {
      model: "claude-sonnet-4-6",
    });
    expect(res.status).toBe(400);
  });
});
