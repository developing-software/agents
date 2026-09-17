import { Email } from "@agents/core/email";
import { createCloudflareSender } from "@agents/core/email/cloudflare";
import type { ApiEnv } from "../../cf";
import { worker } from "../../target";
import { server } from "../index";

export default worker<ApiEnv>(server, (env) => [
  Email.provider(createCloudflareSender(env.SEND_EMAIL)),
]);
