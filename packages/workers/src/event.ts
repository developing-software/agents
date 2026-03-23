import { Log } from "@agents/core/util/log";
import type { MessageBatch } from "@cloudflare/workers-types";

interface Env {

}

const log = Log.create({ namespace: "workers.event" });

export default {
  async queue(batch: MessageBatch, env: Env) {
    for (const message of batch.messages) {
      log.info("Processing message", {
        body: message.body,
        attempts: message.attempts,
      });
      message.ack()
    }
  },
};
