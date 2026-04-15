import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import { Models } from "@agents/core/models";
import { authRequired, validator, Result, ErrorResponses } from "../common";

export namespace ModelsApi {
  export const route = new Hono()
    .get(
      "/pricing",
      authRequired,
      describeRoute({
        tags: ["Models"],
        summary: "List all model pricing",
        description: "Returns pricing data for all models. Costs are in dollars per 1M tokens.",
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
          modelId: Models.Info.shape.id.meta({
            description: "Model ID to look up (supports longest-prefix-match)",
            example: "claude-sonnet-4-6",
          }),
        }),
      ),
      validator(
        "query",
        z.object({
          provider: z.string().optional().meta({
            description: "Provider ID to filter pricing lookup (e.g. anthropic, openai)",
            example: "anthropic",
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
        const { provider } = c.req.valid("query");
        const pricing = await Models.pricing(modelId, provider);
        return c.json({ pricing });
      },
    )
    .post(
      "/cost",
      authRequired,
      validator(
        "json",
        z.object({
          model: Models.Pricing.shape.model,
          provider: z.string().optional().meta({
            description: "Provider ID to filter pricing lookup (e.g. anthropic, openai)",
            example: "anthropic",
          }),
          tokens: Models.TokenCounts,
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
                    pricing: Models.Pricing.nullable(),
                    cost_usd: z
                      .number()
                      .nullable()
                      .meta({ description: "Total cost in USD", example: 0.225 }),
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
        const { model, provider, tokens } = c.req.valid("json");
        const pricing = await Models.pricing(model, provider);
        const cost_usd = pricing ? Models.calculateCost(tokens, pricing.cost) : null;
        return c.json({ pricing, cost_usd });
      },
    );
}
