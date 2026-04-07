import { z } from "zod";

export namespace ChecksEvent {
  export namespace Completed {
    export const CheckResult = z.object({
      outcome: z.string().catch("unknown"),
      summary: z.string().nullable().catch(null),
    });

    export const Data = z.object({
      checks: z.record(z.string(), z.record(z.string(), CheckResult)).catch({}),
      workflow: z
        .object({
          durationMs: z.number().catch(0),
          runUrl: z.string().catch(""),
          trigger: z.string().catch(""),
          conclusion: z.enum(["success", "failure", "cancelled"]).nullable().catch(null),
          jobs: z
            .array(
              z.object({
                name: z.string(),
                conclusion: z.string().nullable(),
              }),
            )
            .optional()
            .catch(undefined),
        })
        .catch({ durationMs: 0, runUrl: "", trigger: "", conclusion: null }),
    });

    export type Data = z.infer<typeof Data>;
    export type CheckResult = z.infer<typeof CheckResult>;

    /** Parse untyped event data — never throws, returns defaults for missing/invalid fields. */
    export function parse(raw: unknown): Data {
      return Data.parse(raw);
    }
  }
}
