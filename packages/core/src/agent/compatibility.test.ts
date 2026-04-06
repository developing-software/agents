import { describe, test, expect } from "bun:test";
import { AgentCompat } from "./compatibility";

describe("AgentCompat", () => {
  describe("config", () => {
    test("all agents have config entries", () => {
      expect(AgentCompat.config.claude).toBeDefined();
      expect(AgentCompat.config.opencode).toBeDefined();
      expect(AgentCompat.config.codex).toBeDefined();
    });

    test("each config has required fields", () => {
      for (const [, cfg] of Object.entries(AgentCompat.config)) {
        expect(cfg.label).toBeString();
        expect(cfg.providers.length).toBeGreaterThan(0);
        expect(cfg.featured.length).toBeGreaterThan(0);
        expect(cfg.defaultModel).toBeString();
        expect(typeof cfg.formatModelId).toBe("function");
      }
    });
  });

  describe("formatModelId", () => {
    test("claude uses plain model ID", () => {
      const fmt = AgentCompat.config.claude.formatModelId;
      expect(fmt("claude-sonnet-4-6", "anthropic")).toBe("claude-sonnet-4-6");
    });

    test("opencode uses provider/model format", () => {
      const fmt = AgentCompat.config.opencode.formatModelId;
      expect(fmt("gpt-5.4-pro", "openai")).toBe("openai/gpt-5.4-pro");
      expect(fmt("claude-sonnet-4-6", "anthropic")).toBe("anthropic/claude-sonnet-4-6");
      expect(fmt("gemini-2.5-pro", "google")).toBe("google/gemini-2.5-pro");
    });

    test("codex uses plain model ID", () => {
      const fmt = AgentCompat.config.codex.formatModelId;
      expect(fmt("o3", "openai")).toBe("o3");
    });
  });

  describe("featuredModels", () => {
    test("claude returns only anthropic models", async () => {
      const models = await AgentCompat.featuredModels("claude");
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) {
        expect(m.providerId).toBe("anthropic");
      }
    });

    test("opencode returns models from multiple providers", async () => {
      const models = await AgentCompat.featuredModels("opencode");
      expect(models.length).toBeGreaterThan(0);
      const providers = new Set(models.map((m) => m.providerId));
      expect(providers.size).toBeGreaterThan(1);
    });

    test("codex returns only openai models", async () => {
      const models = await AgentCompat.featuredModels("codex");
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) {
        expect(m.providerId).toBe("openai");
      }
    });

    test("featured models match configured family prefixes", async () => {
      const models = await AgentCompat.featuredModels("claude");
      const cfg = AgentCompat.config.claude;
      for (const m of models) {
        const family = (m.family ?? m.modelId).toLowerCase();
        const matchesAny = cfg.featured.some((prefix) => family.startsWith(prefix.toLowerCase()));
        expect(matchesAny).toBe(true);
      }
    });

    test("models have correct shape", async () => {
      const models = await AgentCompat.featuredModels("claude");
      for (const m of models.slice(0, 3)) {
        expect(m.id).toBeString();
        expect(m.modelId).toBeString();
        expect(m.label).toBeString();
        expect(m.providerId).toBeString();
        expect(m.providerName).toBeString();
        expect(m.providerLogo).toBeString();
        expect(m.providerLogo).toInclude("models.dev/logos/");
        expect(typeof m.reasoning).toBe("boolean");
        expect(typeof m.isDefault).toBe("boolean");
      }
    });

    test("default model is flagged", async () => {
      const models = await AgentCompat.featuredModels("claude");
      const defaults = models.filter((m) => m.isDefault);
      expect(defaults.length).toBe(1);
      expect(defaults[0]!.id).toBe(AgentCompat.config.claude.defaultModel);
    });
  });

  describe("allModels", () => {
    test("returns more models than featured", async () => {
      const featured = await AgentCompat.featuredModels("opencode");
      const all = await AgentCompat.allModels("opencode");
      expect(all.length).toBeGreaterThan(featured.length);
    });

    test("opencode includes anthropic, openai, and google providers", async () => {
      const models = await AgentCompat.allModels("opencode");
      const providers = new Set(models.map((m) => m.providerId));
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("google")).toBe(true);
    });

    test("opencode models use provider/model format", async () => {
      const models = await AgentCompat.allModels("opencode");
      for (const m of models.slice(0, 5)) {
        expect(m.id).toInclude("/");
        expect(m.id.split("/")[0]).toBe(m.providerId);
      }
    });

    test("claude models use plain IDs", async () => {
      const models = await AgentCompat.allModels("claude");
      for (const m of models.slice(0, 5)) {
        expect(m.id).not.toInclude("/");
      }
    });
  });
});
