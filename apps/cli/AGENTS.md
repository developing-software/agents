# cli/

`dev-agents` — runs and talks to the Agents stack. Bun-only; `src/index.ts` is the bin.

## Layout

| File               | Owns                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| `src/index.ts`     | Command table + help text. Every command is one entry in `commands`. |
| `src/api.ts`       | `api` — SDK reflection, client resolution, `output()`                |
| `src/events.ts`    | `events emit` — ergonomic wrapper over `postEvents`                  |
| `src/artifacts.ts` | `artifacts upload` — multipart upload (the SDK has no file support)  |
| `src/auth.ts`      | `login` (browser PKCE), `logout`                                     |
| `src/serve.ts`     | `serve api\|auth\|console`                                           |
| `src/health.ts`    | `health <target>` — probe a surface, exit code as the answer         |
| `src/config.ts`    | `~/.config/dev-agents/config.json` + token/url/issuer resolution     |
| `src/args.ts`      | `--flag` helpers (`value`, `strip`, `params`)                        |
| `build.ts`         | cross-platform `bun build --compile` → `dist/`                       |

## Rules

- **Never hardcode API method names.** `api.ts` reflects `DevAgentSdk.prototype`, so new
  endpoints appear after `bun run gen` with zero edits here. Hand-written commands
  (`events`, `artifacts`) exist only where the raw call is unergonomic.
- **Adding a command** = one function + one entry in `commands` in `index.ts`, and update
  `help` there and `README.md`.
- **Adding a serve target** = one entry in `targets` in `serve.ts`, plus its port in
  `ports` in `health.ts`. `api`/`auth` import the functions' bun targets, so they serve
  exactly what `bun dev` runs — don't re-wire providers here.
- Resolution order lives in `config.ts` only: token `--token` › `AGENTS_TOKEN` › saved
  token › saved OAuth access (auto-refreshed); url `--url` › `API_URL` › saved › prod.
- Output goes through `output()`: JSON on stdout, errors on stderr with non-zero exit.

## Tests

- `tests/cli.test.ts` — args, SDK reflection, client plumbing, `output()`, `health`.
- `tests/config.test.ts` — resolution order against a real scratch config file.
- `tests/setup.ts` (preloaded) points `XDG_CONFIG_HOME` at a scratch dir; `config.ts`
  freezes its path at import, so it must be a preload.
- `tests/sdk.test.ts` — SDK against the in-process API on pglite.

## Commands

```sh
bun run src/index.ts <command>   # or `bun cli <command>` from the repo root
bun run build                    # compile dist/dev-agents
bun typecheck
bun test
```
