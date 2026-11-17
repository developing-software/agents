import { Context } from "@agents/core/context";
import { Database } from "@agents/core/drizzle";
import { Email } from "@agents/core/email";
import { run } from "@agents/core/jobs";
import { Kv } from "@agents/core/kv";
import { redis } from "@agents/core/kv/adapter/redis";
import { Queue } from "@agents/core/queue";
import { Storage } from "@agents/core/storage";

// Worker for the `db` driver; importing `run` from the jobs barrel registers every handler.
// A hung db round-trip can't recheck the signal, so a second signal hard-exits.
const abort = new AbortController();
function bye() {
  if (abort.signal.aborted) process.exit(1);
  abort.abort();
}
process.on("SIGINT", bye);
process.on("SIGTERM", bye);

await Context.withProviders(
  () => Queue.work({ signal: abort.signal, run }),
  Database.provider(Database.connect()),
  Storage.provider(Storage.fromEnv(process.env)),
  Email.provider(Email.fromEnv(process.env)),
  Queue.provider(Queue.Providers.db({ use: Database.use })),
  Kv.provider(Kv.fromEnv(process.env, Database.use, { redis })),
);

// The pool holds the loop open once work() returns.
process.exit(0);
