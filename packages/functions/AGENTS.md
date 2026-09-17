# functions/

HTTP API layer — Hono server (port 3000) exposing OpenAPI-documented endpoints backed by `@agents/core`.

## Structure

```
src/
  target.ts              — worker() / bun() entry helpers: Database (+ extra providers) per request
  cf.ts                  — Cloudflare binding types (HYPERDRIVE, SEND_EMAIL, Artifacts, AuthKv)
  health.ts              — /healthz (live), /readyz (ready), /startupz (start)
  api/
    index.ts             — `server`: probes at the root, routes under /api
    routes.ts            — route definitions
    middleware.ts        — actor setup + error → HTTP response
    handler/             — one file per domain (auth, github, profile, token, event, app)
    target/worker.ts     — Cloudflare worker entry (infra/api.ts)
    target/bun.ts        — Bun server (`bun dev`, `dev-agents serve api`, Docker)
  auth/
    index.ts             — OpenAuth issuer, probes mounted in front
    target/worker.ts     — Cloudflare worker entry (infra/auth.ts)
    target/bun.ts        — Bun server
  event/target/worker.ts — Bus queue consumer (infra/bus.ts)
```

## Targets

Each surface is runtime-agnostic; `target/<runtime>.ts` is the only place a runtime is
chosen. Worker targets build a pool per request (Workers forbid reusing sockets). Bun
targets share one pool for the process, unless `PG_RELEASE=true` cycles it per request so
pglite's single connection can pass between dev processes. Adding a surface = one app
module plus one file per runtime under its `target/`.

## Key Patterns

**Actor** — every handler runs under an actor resolved by `middleware.ts`. Use the `Actor` namespace:

```ts
import { Actor } from "@agents/core/actor";

Actor.use(); // get current actor ({ type, properties }) — falls back to "public"
Actor.userID(); // get userID or throw 401 if unauthenticated
Actor.assert("user"); // assert type and return typed actor, throws 401 if mismatch
Actor.assertFlag(flag); // assert the user has a feature flag, throws 403 if not
```

Middleware sets the actor via `Actor.provide(type, properties, next)` — handlers never call `provide` directly.

**Errors** — throw `VisibleError` for client-safe error responses:

```ts
import { VisibleError } from "@agents/core/error";
throw new VisibleError("not_found", 404, "Resource not found");
```

**OpenAPI** — annotate routes with Zod schemas using Hono's OpenAPI integration. Every public route must have request/response schemas.

**Handlers** — keep handlers thin: validate input, call a `@agents/core` function, return the result. No business logic in handlers.

## Commands

```sh
bun run dev          # api bun target, hot reload (API_PORT, default 3000)
bun run dev:auth     # auth bun target, hot reload (AUTH_PORT, default 3002)
bun run gen:spec     # regenerate packages/sdk/openapi.json from routes
bun typecheck        # type check
bun test             # run tests
```

Regenerate the OpenAPI spec whenever routes or schemas change — the SDK (`packages/sdk/ts`) is generated from it.
