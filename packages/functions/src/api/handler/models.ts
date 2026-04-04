import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { Models } from "@agents/core/models/index";
import { authRequired, validator, Result, ErrorResponses } from "../common";

export namespace ModelsApi {
  export const route = new Hono()
    .get(
      "/pricing",
      authRequired,
      describeRoute({
        tags: ["Models"],
        summary: "List all model pricing",
        description:
          "Returns pricing data for all models. Costs are in dollars per 1M tokens.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    models: z.record(z.string(), Models.Pricing),
                  }),
                ),
              },
            },
            description: "All model pricing",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      async (c) => {
        const allModels = await Models.allModels();
        const models: Record<string, Models.Pricing> = {};
        for (const m of allModels) {
          if (!m.cost) continue;
          models[m.id] = {
            model: m.id,
            provider: m.providerId,
            cost: m.cost,
          };
        }
        return c.json({ models });
      },
    )
    .get(
      "/pricing/:modelId",
      authRequired,
      validator(
        "param",
        z.object({
          modelId: z.string().meta({
            description: "Model ID to look up (supports longest-prefix-match)",
            example: "claude-sonnet-4-6",
          }),
        }),
      ),
      describeRoute({
        tags: ["Models"],
        summary: "Get pricing for a model",
        description:
          "Looks up pricing for a model ID using exact match, then longest-prefix-match. Costs are in dollars per 1M tokens.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    pricing: Models.Pricing.nullable(),
                  }),
                ),
              },
            },
            description: "Model pricing (null if not found)",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      async (c) => {
        const { modelId } = c.req.valid("param");
        const pricing = await Models.pricing(modelId);
        return c.json({ pricing });
      },
    )
    .post(
      "/cost",
      authRequired,
      validator(
        "json",
        z.object({
          model: z.string().meta({
            description: "Model ID (supports longest-prefix-match)",
            example: "claude-sonnet-4-6",
          }),
          tokens: z.object({
            input: z.number().int().min(0).meta({ description: "Input tokens", example: 50000 }),
            output: z.number().int().min(0).meta({ description: "Output tokens", example: 5000 }),
            cacheRead: z.number().int().min(0).optional().meta({ description: "Cache read tokens" }),
            cacheWrite: z.number().int().min(0).optional().meta({ description: "Cache write tokens" }),
            reasoning: z.number().int().min(0).optional().meta({ description: "Reasoning tokens" }),
          }).meta({ description: "Token counts from the model usage" }),
        }),
      ),
      describeRoute({
        tags: ["Models"],
        summary: "Calculate cost for model usage",
        description:
          "Given a model ID and token counts, resolves pricing via longest-prefix-match and returns the calculated cost in USD.",
        responses: {
          200: {
            content: {
              "application/json": {
                schema: Result(
                  z.object({
                    pricing: Models.Pricing.nullable().meta({ description: "Resolved pricing record" }),
                    cost_usd: z.number().nullable().meta({ description: "Total cost in USD", example: 0.225 }),
                  }),
                ),
              },
            },
            description: "Calculated cost",
          },
          401: ErrorResponses[401],
          429: ErrorResponses[429],
          500: ErrorResponses[500],
        },
      }),
      async (c) => {
        const { model, tokens } = c.req.valid("json");
        const pricing = await Models.pricing(model);
        const cost_usd = pricing ? Models.calculateCost(tokens, pricing.cost) : null;
        return c.json({ pricing, cost_usd });
      },
    );
}
