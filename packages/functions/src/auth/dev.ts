import { createAuth } from "./index";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";

const auth = createAuth(MemoryStorage({}));

Bun.serve({
  port: process.env.PORT ?? 3002,
  fetch: async (req) => {
    return auth.fetch(req);
  },
});
