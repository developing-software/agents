import { lambda } from "../../target";
import { Database } from "@agents/core/drizzle";
import { Queue } from "@agents/core/queue";
import { Storage } from "@agents/core/storage";
import { app } from "../routes";

export const handler = lambda(
  app,
  Storage.provider(Storage.fromEnv(process.env)),
  Queue.provider(Queue.fromEnv(process.env, Database.use)),
);
