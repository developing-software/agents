import type { ExecutionContext } from "@cloudflare/workers-types";
import { CloudflareStorage } from "@openauthjs/openauth/storage/cloudflare";
import { Email } from "@agents/core/email";
import { createCloudflareSender } from "@agents/core/email/cloudflare";
import type { AuthEnv } from "../../cf";
import { worker } from "../../target";
import { createAuth } from "../index";

let app: ReturnType<typeof worker<AuthEnv>> | undefined;

// The KV binding only exists per request, so the issuer is built on the first one.
export default {
  fetch(request: Request, env: AuthEnv, ctx: ExecutionContext) {
    app ??= worker<AuthEnv>(createAuth(CloudflareStorage({ namespace: env.AuthKv })), (env) => [
      Email.provider(createCloudflareSender(env.SEND_EMAIL)),
    ]);
    return app.fetch(request, env, ctx);
  },
};
