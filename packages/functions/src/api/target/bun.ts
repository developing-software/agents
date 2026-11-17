import { bun } from "../../target";
import { Database } from "@agents/core/drizzle";
import { Kv } from "@agents/core/kv";
import { redis } from "@agents/core/kv/adapter/redis";
import { Queue } from "@agents/core/queue";
import { Storage } from "@agents/core/storage";
import { app } from "../routes";

const port = parseInt(process.env.API_PORT!) || 3000;
console.log(`Running at http://localhost:${port}`);

export default bun(
  app,
  port,
  Storage.provider(Storage.fromEnv(process.env)),
  Queue.provider(Queue.fromEnv(process.env, Database.use)),
  Kv.provider(Kv.fromEnv(process.env, Database.use, { redis })),
);
