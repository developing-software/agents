#!/usr/bin/env bun

import { $ } from "bun";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const root = `${import.meta.dir}/../packages/core`;
const host = "127.0.0.1";

/** Asks the OS for an unused port. */
function free() {
  const probe = Bun.serve({ port: 0, fetch: () => new Response() });
  const port = probe.port!;
  probe.stop(true);
  return port;
}

// bun sets NODE_ENV=test; each test run gets its own db, so it can neither collide with a
// running dev server nor reach whatever DATABASE_URL the shell happens to export.
const test = process.env.NODE_ENV === "test";

function pick() {
  if (test) return free();
  if (process.env.PGPORT) return Number(process.env.PGPORT);
  if (process.env.DATABASE_URL) return Number(new URL(process.env.DATABASE_URL).port || 5432);
  return 5432;
}

const port = pick();

// db:push (drizzle-kit) and anything importing Database read this
const url = `postgresql://postgres:password@${host}:${port}/postgres`;
if (test) process.env.DATABASE_URL = url;
else process.env.DATABASE_URL ??= url;
// The socket server accepts exactly one connection, so the pool must not grow.
process.env.PG_MAX = "1";

const db = await PGlite.create();

const server = new PGLiteSocketServer({ db, port, host });
await server.start();

console.log(`Running migrations...`);

await $`bun run db:push`.cwd(root).env({ ...process.env }).quiet();

console.log(`Migrations completed.`);

console.log(`Server started on ${host}:${port}`);

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Stopping server...");
  await server.stop();
  await db.close();

  console.log("Server stopped and database closed");
  process.exit(0);
});
