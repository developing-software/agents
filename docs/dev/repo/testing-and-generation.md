# Testing And Generation

## Validation Commands

```sh
bun run fmt
bun run lint
bun run typecheck
bun test
```

## Database

```sh
bun run db:gen
bun run db:push
```

## API And SDK

```sh
bun run gen:spec
bun run gen
```

## What To Regenerate

- update `packages/sdk/openapi.json` after API schema changes
- regenerate `packages/sdk/ts` after the OpenAPI spec changes
- keep docs and examples aligned with current tag semantics and event behavior
