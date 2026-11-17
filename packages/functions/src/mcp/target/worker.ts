import { Queue } from "@agents/core/queue";
import type { QueueEnv } from "../../cf";
import { worker } from "../../target";
import { app } from "../index";

export default worker(app, (env: QueueEnv) => [
  Queue.provider(Queue.Providers.cloudflare(env.Jobs)),
]);
