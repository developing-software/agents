import { z } from "zod";

export namespace DeployEvent {
  export namespace Completed {
    export const Pr = z.object({
      number: z.number().catch(0),
      title: z.string().catch(""),
      author: z.string().catch(""),
      headRef: z.string().catch(""),
      baseRef: z.string().catch(""),
      headSha: z.string().catch(""),
      url: z.string().catch(""),
    });

    export const Data = z.object({
      stage: z.string().catch(""),
      tool: z.string().catch(""),
      outputs: z.record(z.string(), z.string()).catch({}),
      pr: Pr.nullable().catch(null),
      workflow: z
        .object({
          durationMs: z.number().catch(0),
          runUrl: z.string().catch(""),
          trigger: z.string().catch(""),
          conclusion: z.enum(["success", "failure", "cancelled"]).nullable().catch(null),
        })
        .catch({ durationMs: 0, runUrl: "", trigger: "", conclusion: null }),
    });

    export type Data = z.infer<typeof Data>;
    export type Pr = z.infer<typeof Pr>;

    /** Parse untyped event data — never throws, returns defaults for missing/invalid fields. */
    export function parse(raw: unknown): Data {
      return Data.parse(raw);
    }
  }
}
