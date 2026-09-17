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
- the CLI's `dev-agents api` command reflects the generated SDK, so it picks up new endpoints after `bun run gen` with no edits

## Test Database

Test preloads start `scripts/pglite.ts` on a free port and point `DATABASE_URL` at it, so
`bun test` needs no running Postgres and never touches a dev or real database.

## CI Coverage

`bun run test:ci` writes junit and lcov per package; `bun scripts/coverage.ts` prints a
coverage table suitable for `$GITHUB_STEP_SUMMARY`.
