import { Queue } from "@agents/core/queue";
import { Storage } from "@agents/core/storage";
import type { QueueEnv } from "../../cf";
import { worker } from "../../target";
import { app } from "../routes";

export default worker(app, (env: QueueEnv) => [
  Storage.provider(Storage.Providers.r2(env.Files)),
  Queue.provider(Queue.Providers.cloudflare(env.Jobs)),
]);
