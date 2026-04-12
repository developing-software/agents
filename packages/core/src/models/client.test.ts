import { describe, test, expect } from "bun:test";
import { Models } from "./client";

describe("Models", () => {
  test("list() fetches and parses the full API response", async () => {
    const data = await Models.list();
    const providers = Object.keys(data);
    expect(providers.length).toBeGreaterThan(0);

    const first = data[providers[0]!]!;
    expect(first.id).toBeString();
    expect(first.name).toBeString();
  });

  test("providers() returns an array of providers", async () => {
    const providers = await Models.providers();
    expect(providers.length).toBeGreaterThan(50);
    for (const p of providers.slice(0, 5)) {
      expect(p.id).toBeString();
      expect(p.name).toBeString();
    }
  });

  test("provider() returns a single provider by id", async () => {
    const p = await Models.provider("openai");
    expect(p).toBeDefined();
    expect(p!.id).toBe("openai");
    expect(p!.models).toBeDefined();
    expect(Object.keys(p!.models!).length).toBeGreaterThan(0);
  });

  test("provider() returns undefined for unknown id", async () => {
    const p = await Models.provider("not-a-real-provider-xyz");
    expect(p).toBeUndefined();
  });

  test("allModels() returns flattened models with provider info", async () => {
    const models = await Models.allModels();
    expect(models.length).toBeGreaterThan(100);

    for (const m of models.slice(0, 10)) {
      expect(m.id).toBeString();
      expect(m.name).toBeString();
      expect(m.providerId).toBeString();
      expect(m.providerName).toBeString();
    }
  });

  test("allModels() models have expected cost fields", async () => {
    const models = await Models.allModels();
    const withCost = models.find((m) => m.cost?.input != null);
    expect(withCost).toBeDefined();
    expect(withCost!.cost!.input).toBeNumber();

    const withCache = models.find((m) => m.cost?.cache_read != null);
    expect(withCache).toBeDefined();
    expect(withCache!.cost!.cache_read).toBeNumber();

    const withLimit = models.find((m) => m.limit?.context != null);
    expect(withLimit).toBeDefined();
    expect(withLimit!.limit!.context).toBeNumber();
  });

  test("logoUrl() returns correct URL", () => {
    expect(Models.logoUrl("anthropic")).toBe("https://models.dev/logos/anthropic.svg");
    expect(Models.logoUrl("openai")).toBe("https://models.dev/logos/openai.svg");
  });

  test("pricing() returns exact match", async () => {
    const p = await Models.pricing("claude-sonnet-4-6", "anthropic");
    expect(p).not.toBeNull();
    expect(p!.model).toBe("claude-sonnet-4-6");
    expect(p!.provider).toBe("anthropic");
    expect(p!.cost.input).toBeNumber();
    expect(p!.cost.output).toBeNumber();
    expect(p!.cost.cache_read).toBeNumber();
    expect(p!.cost.cache_write).toBeNumber();
  });

  test("pricing() returns longest prefix match for dated model IDs", async () => {
    const p = await Models.pricing("claude-sonnet-4-6-20260217", "anthropic");
    expect(p).not.toBeNull();
    expect(p!.model).toInclude("claude-sonnet-4-6");
    expect(p!.provider).toBe("anthropic");
  });

  test("pricing() returns null for unknown model", async () => {
    const p = await Models.pricing("not-a-real-model-xyz");
    expect(p).toBeNull();
  });

  test("calculateCost() computes USD from tokens", () => {
    const cost: Models.Cost = {
      input: 3,
      output: 15,
      cache_read: 0.3,
      cache_write: 3.75,
    };

    const usd = Models.calculateCost(
      { input: 1_000_000, output: 100_000, cacheRead: 500_000 },
      cost,
    );
    // 1M input * $3/1M + 100k output * $15/1M + 500k cache_read * $0.3/1M
    // = 3 + 1.5 + 0.15 = 4.65
    expect(usd).toBeCloseTo(4.65, 5);
  });

  test("calculateCost() handles zero tokens", () => {
    const cost: Models.Cost = { input: 3, output: 15 };
    const usd = Models.calculateCost({ input: 0, output: 0 }, cost);
    expect(usd).toBe(0);
  });

  test("pricingBatch() returns pricing for multiple models", async () => {
    const result = await Models.pricingBatch(["claude-sonnet-4-6", "not-a-real-model-xyz"]);
    expect(result["claude-sonnet-4-6"]).not.toBeNull();
    expect(result["not-a-real-model-xyz"]).toBeNull();
  });
});
