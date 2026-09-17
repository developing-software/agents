# scripts

Bun scripts for running and populating the stack locally. Run from the repo root.

| Script         | What                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| `dev.ts`       | The whole stack. Spawns db, api, auth, console; owns lifetimes/output  |
| `seed.ts`      | Dev account, workspace and a fresh API token through core's operations |
| `reset.ts`     | Drops the public schema so the next `db:push` rebuilds it              |
| `pglite.ts`    | In-process Postgres for `DB=pglite` and the test preloads              |
| `gen-sdk.ts`   | OpenAPI spec → `packages/sdk/ts` → fmt (`bun run gen`)                 |
| `coverage.ts`  | Aggregates per-package lcov into a table (`bun run test:ci` output)    |
| `prototype.ts` | Serves `docs/prototype/*/PROTOTYPE.md` with live mockups               |

## bun dev

`DB=docker` (default) runs Postgres from `infra/docker/compose.yml`; `DB=pglite` runs it
in-process. `RESET=1` (or `--reset`) wipes first — only matters for docker. Ports:
`API_PORT` 3000, `AUTH_PORT` 3002, `WEB_PORT` 5173, `PGPORT` 5432.

pglite allows exactly **one live connection**, so services cycle their pool
(`PG_RELEASE=true`, `PG_MAX=1`) instead of holding one. A service added to `dev.ts`
inherits that env, or it will fight the others for the socket.

Under `bun test` (`NODE_ENV=test`), `pglite.ts` always binds a free port and overrides
`DATABASE_URL`, so tests never collide with a dev server or reach a real database.

## Rules

- **Never kill the user's servers.** No `pkill` sweeps. Need a port, use a different one.
- Seeds go through `Actor.provide` + core functions — a raw insert seeds invalid states.
