# cli/

`dev-agents` — CLI tool for interacting with the Agents API: auth, token management, event and artifact viewing.

## Structure

```
src/
  cli.ts              — entry point, registers all commands
  commands/
    login.ts          — OAuth login flow
    logout.ts         — clear local credentials
    token.ts          — create / list personal tokens
    events.ts         — list and stream events
    artifacts.ts      — list and download artifacts
  lib/
    sdk.ts            — initialises @agents/sdk/ts client with stored credentials
    config.ts         — read/write ~/.config/dev-agents config file
    command.ts        — command base class / helpers
    args.ts           — argument parsing
    prompt.ts         — interactive prompts
    colors.ts         — terminal color utilities
    spinner.ts        — loading spinner
    progress.ts       — progress bar
build.ts              — cross-platform Bun build → dist/
dist/                 — compiled binaries (Linux, macOS, Windows)
```

## Runtime — Bun

Use Bun exclusively. Never use Node.js APIs, `express`, `dotenv`, `jest`, `webpack`, or `esbuild`.

| Instead of                   | Use                                |
| ---------------------------- | ---------------------------------- |
| `node <file>` / `ts-node`    | `bun <file>`                       |
| `npm` / `yarn` / `pnpm`      | `bun install` / `bun run` / `bunx` |
| `jest` / `vitest`            | `bun test`                         |
| `dotenv`                     | `.env` loads automatically         |
| `node:fs` readFile/writeFile | `Bun.file`                         |
| `execa` / child_process      | `Bun.$\`cmd\``                     |
| `better-sqlite3`             | `bun:sqlite`                       |
| `pg` / `postgres.js`         | `Bun.sql`                          |

## Key Patterns

- Initialise the SDK client via `src/lib/sdk.ts` — reads stored token from `src/lib/config.ts`
- All terminal output goes through `src/lib/colors.ts` helpers — no raw ANSI escape codes
- Use `src/lib/spinner.ts` for async operations, `src/lib/prompt.ts` for interactive input
- Commands are thin: validate args, call SDK, format output

## Commands

```sh
bun run src/cli.ts <command>   # run locally
bun run build.ts               # build cross-platform binaries into dist/
bun typecheck                  # type check
bun test                       # run tests
```
