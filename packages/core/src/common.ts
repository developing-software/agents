// import "zod-openapi/extend";
import { z } from "zod";
export namespace Common {
  export const IdDescription = `Unique object identifier.
The format and length of IDs may change over time.`;

  export const Paginated = z.object({
    page: z.number().min(1).default(1).meta({
      description: "Page number for pagination.",
      example: 1,
    }),
    pageSize: z.number().min(1).max(100).default(10).meta({
      description: "Number of users per page.",
      example: 10,
    }),
  });

  export type Paginated = z.infer<typeof Paginated>;
}
