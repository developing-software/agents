#!/usr/bin/env bun
// Usage: sst shell --stage prod -- bun scripts/studio-prod.ts

import { Resource } from "sst";

const db = Resource.Database;
const DATABASE_URL = db.url;

Bun.spawnSync(["bunx", "drizzle-kit", "studio"], {
  cwd: "./packages/core",
  env: { ...process.env, DATABASE_URL },
  stdio: ["inherit", "inherit", "inherit"],
});
