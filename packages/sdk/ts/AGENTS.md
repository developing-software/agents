# sdk/ts/

Auto-generated TypeScript SDK for the Agents API. **Do not hand-edit files under `src/` — they are fully generated.**

## Source of Truth

The SDK is generated from `packages/sdk/openapi.json`, which is itself generated from the running API routes in `packages/functions`.

## Regeneration Workflow

1. Change routes / schemas in `packages/functions`
2. `bun run gen:spec` (in `packages/functions`) → updates `packages/sdk/openapi.json`
3. `bun run build` (in this directory) → regenerates all `src/*.gen.ts` files via `@hey-api/openapi-ts`

```sh
# From repo root:
cd packages/functions && bun run gen:spec
cd ../sdk/ts && bun run build
```

## Structure

```
src/
  index.ts          — public API surface (re-exports from generated files)
  sdk.gen.ts        — generated SDK class
  types.gen.ts      — generated request/response types
  client.gen.ts     — generated HTTP client
  client/           — generated client internals
  core/             — generated core utilities (auth, serialisation, SSE, etc.)
openapi.json        — OpenAPI spec (source for generation)
build.ts            — generation script (@hey-api/openapi-ts)
```

## Usage

```ts
import { createClient } from "@agents/sdk/ts";

const client = createClient({ baseUrl: "http://localhost:3000" });
```

If you need to add a helper or wrapper, create a non-`.gen.ts` file and re-export from `src/index.ts`. Never modify `.gen.ts` files directly.
