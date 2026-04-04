# functions/

HTTP API layer — Hono server (port 3000) exposing OpenAPI-documented endpoints backed by `@agents/core`.

## Structure

```
src/
  index.ts              — entry point, starts Hono server
  api/
    index.ts            — mounts all routers
    routes.ts           — route definitions
    middleware.ts       — actor setup + error → HTTP response
    handler/            — one file per domain (auth, github, profile, token, event, app)
  auth/                 — OpenAuth OAuth2 server setup
```

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
bun run dev          # start dev server with hot reload
bun run gen:spec     # regenerate packages/sdk/openapi.json from routes
bun typecheck        # type check
bun test             # run tests
```

Regenerate the OpenAPI spec whenever routes or schemas change — the SDK (`packages/sdk/ts`) is generated from it.
