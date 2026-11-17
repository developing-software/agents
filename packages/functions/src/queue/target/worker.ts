import type { Message, MessageBatch } from "@cloudflare/workers-types";
import { Context } from "@agents/core/context";
import { Database } from "@agents/core/drizzle";
import { Email } from "@agents/core/email";
import { Queue } from "@agents/core/queue";
import type { Job } from "@agents/core/queue/port";
import { Storage } from "@agents/core/storage";
import { Log } from "@agents/core/util/log";
import { run } from "@agents/core/jobs";
import type { EmailEnv, QueueEnv } from "../../cf";

/** Handlers may enqueue follow-ups and send mail, so this worker needs both bindings. */
type Env = QueueEnv & EmailEnv;

const log = Log.create({ namespace: "queue.worker" });

/**
 * Cloudflare consumer for the `cloudflare` driver's queue. Cloudflare delivers batches
 * and counts attempts, so this just runs each job and acks or retries.
 */
export default {
  async queue(batch: MessageBatch<Job>, env: Env) {
    // One pool per batch, closed once every message settles.
    const db = Database.connect(env.Hyperdrive.connectionString, { max: 5 });
    await Promise.all(batch.messages.map((msg) => handle(msg, env, db))).finally(() =>
      Database.release(db),
    );
  },
};

/** One message, contained: a thrown handler retries that job alone, not the batch. */
async function handle(msg: Message<Job>, env: Env, db: Database.Client) {
  const job = { ...msg.body, attempts: msg.attempts };
  const err = await Promise.resolve()
    .then(() =>
      Context.withProviders(
        () => run(job),
        Database.provider(db),
        Storage.provider(Storage.Providers.r2(env.Files)),
        Email.provider(Email.Providers.cloudflare(env.SEND_EMAIL)),
        Queue.provider(Queue.Providers.cloudflare(env.Jobs)),
      ),
    )
    .then(
      () => null,
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
  if (!err) return msg.ack();

  log.warn("job failed", { name: job.name, id: job.id, attempts: job.attempts });
  log.error(err);
  msg.retry();
}
