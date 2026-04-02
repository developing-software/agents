import { describe, test, expect } from "bun:test";
import { ModelsDev } from "./client";

describe("ModelsDev", () => {
  test("list() fetches and parses the full API response", async () => {
    const data = await ModelsDev.list();
    const providers = Object.keys(data);
    expect(providers.length).toBeGreaterThan(0);

    const first = data[providers[0]!]!;
    expect(first.id).toBeString();
    expect(first.name).toBeString();
  });

  test("providers() returns an array of providers", async () => {
    const providers = await ModelsDev.providers();
    expect(providers.length).toBeGreaterThan(50);
    for (const p of providers.slice(0, 5)) {
      expect(p.id).toBeString();
      expect(p.name).toBeString();
    }
  });

  test("provider() returns a single provider by id", async () => {
    const p = await ModelsDev.provider("openai");
    expect(p).toBeDefined();
    expect(p!.id).toBe("openai");
    expect(p!.models).toBeDefined();
    expect(Object.keys(p!.models!).length).toBeGreaterThan(0);
  });

  test("provider() returns undefined for unknown id", async () => {
    const p = await ModelsDev.provider("not-a-real-provider-xyz");
    expect(p).toBeUndefined();
  });

  test("allModels() returns flattened models with provider info", async () => {
    const models = await ModelsDev.allModels();
    expect(models.length).toBeGreaterThan(100);

    for (const m of models.slice(0, 10)) {
      expect(m.id).toBeString();
      expect(m.name).toBeString();
      expect(m.providerId).toBeString();
      expect(m.providerName).toBeString();
    }
  });

  test("allModels() models have expected fields", async () => {
    const models = await ModelsDev.allModels();
    const withCost = models.find((m) => m.cost?.input != null);
    expect(withCost).toBeDefined();
    expect(withCost!.cost!.input).toBeNumber();

    const withLimit = models.find((m) => m.limit?.context != null);
    expect(withLimit).toBeDefined();
    expect(withLimit!.limit!.context).toBeNumber();
  });

  test("logoUrl() returns correct URL", () => {
    expect(ModelsDev.logoUrl("anthropic")).toBe(
      "https://models.dev/logos/anthropic.svg",
    );
    expect(ModelsDev.logoUrl("openai")).toBe(
      "https://models.dev/logos/openai.svg",
    );
  });
});
