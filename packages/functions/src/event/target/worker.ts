import type { MessageBatch } from "@cloudflare/workers-types";
import { Log } from "@agents/core/util/log";

const log = Log.create({ namespace: "event.worker" });

/** Consumer for the `Bus` queue. */
export default {
  async queue(batch: MessageBatch) {
    for (const message of batch.messages) {
      log.info("Processing message", {
        body: message.body,
        attempts: message.attempts,
      });
      message.ack();
    }
  },
};
