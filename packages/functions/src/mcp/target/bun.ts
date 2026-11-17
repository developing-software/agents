import { bun } from "../../target";
import { Database } from "@agents/core/drizzle";
import { Kv } from "@agents/core/kv";
import { redis } from "@agents/core/kv/adapter/redis";
import { Queue } from "@agents/core/queue";
import { app } from "../index";

const port = parseInt(process.env.MCP_PORT!) || 3001;
console.log(`MCP running at http://localhost:${port}/mcp`);

// Tools mutate issues and projects, and every published event pushes a delivery job.
export default bun(
  app,
  port,
  Queue.provider(Queue.fromEnv(process.env, Database.use)),
  Kv.provider(Kv.fromEnv(process.env, Database.use, { redis })),
);
