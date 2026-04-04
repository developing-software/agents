import { z } from "zod";

export namespace AgentEvent {
  // Agent name aliases → canonical ID
  const ALIASES: Record<string, string> = {
    claude: "claude-code",
    "claude-code": "claude-code",
    claudecode: "claude-code",
    codex: "codex",
    opencode: "opencode",
  };

  /** Resolve an agent name to its canonical ID. Returns input lowercased if no alias found. */
  export function resolveAgent(name: string): string {
    return ALIASES[name.toLowerCase()] ?? name.toLowerCase();
  }

  export namespace Completed {
    export const Metrics = z.object({
      tokens: z
        .object({
          input: z.number().nullable().catch(null),
          output: z.number().nullable().catch(null),
          reasoning: z.number().nullable().catch(null),
          cache_read: z.number().nullable().catch(null),
          cache_creation: z.number().nullable().catch(null),
        })
        .catch({
          input: null,
          output: null,
          reasoning: null,
          cache_read: null,
          cache_creation: null,
        }),
      turns: z.number().nullable().catch(null),
      cost_usd: z.number().nullable().catch(null),
      model: z.string().nullable().catch(null),
    });

    export const Pricing = z.object({
      heuristic: z.string().catch("unknown"),
      model: z.string().catch(""),
      provider: z.string().catch(""),
      cost: z.record(z.string(), z.unknown()).catch({}),
      cost_usd: z.number().nullable().catch(null),
    });

    export const Data = z.object({
      agent: z
        .object({
          name: z.string().catch("unknown"),
          sessionId: z.string().nullable().catch(null),
          finalMessage: z.string().nullable().catch(null),
          metrics: Metrics.nullable().catch(null),
          pricing: Pricing.nullable().catch(null),
        })
        .catch({
          name: "unknown",
          sessionId: null,
          finalMessage: null,
          metrics: null,
          pricing: null,
        }),
      workflow: z
        .object({
          durationMs: z.number().catch(0),
          runUrl: z.string().catch(""),
          trigger: z.string().catch(""),
        })
        .catch({ durationMs: 0, runUrl: "", trigger: "" }),
      diff: z
        .object({
          linesAdded: z.number().catch(0),
          linesRemoved: z.number().catch(0),
        })
        .optional()
        .catch(undefined),
      pr: z
        .object({
          url: z.string().catch(""),
        })
        .optional()
        .catch(undefined),
      checks: z
        .record(
          z.string(),
          z.record(
            z.string(),
            z.object({
              outcome: z.string().catch("unknown"),
            }),
          ),
        )
        .optional()
        .catch(undefined),
    });

    export type Data = z.infer<typeof Data>;
    export type Metrics = z.infer<typeof Metrics>;
    export type Pricing = z.infer<typeof Pricing>;

    /** Parse untyped event data — never throws, returns defaults for missing/invalid fields.
     *  Normalizes agent name via aliases and applies pricing→metrics cost fallback. */
    export function parse(raw: unknown): Data {
      const data = Data.parse(raw);
      // Normalize agent name
      data.agent.name = resolveAgent(data.agent.name);
      // Backfill cost from pricing
      if (
        data.agent.metrics &&
        data.agent.metrics.cost_usd == null &&
        data.agent.pricing?.cost_usd != null
      ) {
        data.agent.metrics.cost_usd = data.agent.pricing.cost_usd;
      }
      return data;
    }
  }
}
