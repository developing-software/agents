import { createAuth } from "./index";
import { MemoryStorage } from "@openauthjs/openauth/storage/memory";

const auth = createAuth(MemoryStorage({}));

Bun.serve({
  fetch: async (req) => {
    return auth.fetch(req);
  },
});
