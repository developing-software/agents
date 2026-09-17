import { MemoryStorage } from "@openauthjs/openauth/storage/memory";
import { bun } from "../../target";
import { createAuth } from "../index";

const port = Number(process.env.AUTH_PORT ?? process.env.PORT) || 3002;
console.log(`Auth running at http://localhost:${port}`);

// AUTH_PERSIST backs MemoryStorage with a file, so a single-node restart keeps sessions.
export default bun(createAuth(MemoryStorage({ persist: process.env.AUTH_PERSIST })), port);
