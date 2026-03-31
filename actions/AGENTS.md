# actions/

Reusable GitHub Actions for AI-driven implementation workflows. The core idea: a generic `agents/workflow` harness wraps any AI agent — the harness handles workflow scaffolding (branch, commit, PR, results aggregation, API events), while the agent does the code work.

## Design principles

- **Agent-agnostic** — `agents/workflow` has zero knowledge of Claude, Codex, or any specific agent. Agents run as plain workflow steps between start and post phases.
- **Composable** — each action has one responsibility. Tag collection, event emission, and artifact upload are separate actions composed in the workflow.
- **Results folder** — steps communicate structured results via `$AGENTS_RESULTS_DIR`. Each step writes `result.json` files; the finish phase aggregates them into a single `agent.completed` event.
- **Context tags** — actions communicate shared observable data via `AGENTS_CONTEXT_TAGS_FILE`. Each line is a tag (`namespace:key:value`). All `event/emit` calls inherit these tags automatically.

## Structure

```
actions/
  core/             — shared TypeScript utilities for Node20 actions
  agent/
    workflow/       — harness: branch setup + PR creation + results aggregation + lifecycle events
    result/         — helper: write check result.json + copy output to results folder
    claude/         — collect Claude Code metrics, write agent/result.json, emit agent.result
    codex/          — collect Codex result, write agent/result.json, emit agent.result
  event/
    emit/           — post an event to the Agents API (inherits context tags by default)
    tag/            — append a tag to the workflow context
  artifact/
    upload/         — upload a file or directory to the Agents API under the workflow event
```

## Actions

### `agents/workflow`

The core harness. Runs as a `node20` action with `main` and `post` entrypoints.

- **main** (`src/start.ts`): creates the implementation branch, initialises `AGENTS_CONTEXT_TAGS_FILE`, creates `AGENTS_RESULTS_DIR`, derives agent name from harness, exports `AGENTS_WORKFLOW_EVENT_ID`, posts `agent.started` event
- **post** (`src/finish.ts`): commits and pushes agent changes, creates the PR, reads `AGENTS_RESULTS_DIR` to aggregate agent metrics and check outcomes, posts `agent.completed` with full aggregated data

The post step always runs (`post-if: always()`), even if the agent step fails.

### `event/tag`

Appends a tag to `$AGENTS_CONTEXT_TAGS_FILE`. Accepts either a full `tag` string or a `key`+`value` shorthand (formatted as `metric:key:value`). No-op if `AGENTS_CONTEXT_TAGS_FILE` is not set.

### `event/emit`

Posts an event to the Agents API. By default reads `$AGENTS_CONTEXT_TAGS_FILE` and merges all context tags into the event (`inherit_context: 'true'`). Pass `inherit_context: 'false'` to emit an event without inheriting context. Exports the created event ID to `event_id_env` (default: `EVENT_ID`).

### `agent/claude`

Runs **after** `anthropics/claude-code-action`. Parses token usage and cost from the execution JSON, writes `$AGENTS_RESULTS_DIR/agent/result.json` with metrics, then emits `agent.result` with `{"agent":"claude", ...}` in the event data (exports `CLAUDE_EVENT_ID`). Uploads `claude_code_execution.json` to the Agents API.

### `agent/codex`

Runs **after** `openai/codex-action`. Writes `$AGENTS_RESULTS_DIR/agent/result.json`, emits `agent.result` with `{"agent":"codex", ...}` in the event data (exports `CODEX_EVENT_ID`).

### `artifact/upload`

Uploads a file or directory to the Agents API R2 bucket via `POST /events/:id/artifacts`, using `$AGENTS_WORKFLOW_EVENT_ID` as the event. Accepts a `path` (file or directory) and an optional `name` override (single-file only). Skips silently if `AGENTS_WORKFLOW_EVENT_ID` is not set.

## Env var conventions

| Variable                   | Set by                  | Read by                                                        | Purpose                                         |
| -------------------------- | ----------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| `AGENTS_CONTEXT_TAGS_FILE` | `agents/workflow` start | `event/emit`, `event/tag`, `agent/*`, `agents/workflow` finish | Path to the tag context file (one tag per line) |
| `AGENTS_WORKFLOW_EVENT_ID` | `agents/workflow` start | `artifact/upload`, `agent/*`, `agents/workflow` finish         | ID of the `agent.started` event                 |
| `AGENTS_RESULTS_DIR`       | `agents/workflow` start | `agent/*`, test/lint actions, `agents/workflow` finish          | Path to results folder for inter-step data      |
| `CLAUDE_EVENT_ID`          | `agent/claude`          | downstream steps                                               | ID of the `agent.result` event                  |
| `CODEX_EVENT_ID`           | `agent/codex`           | downstream steps                                               | ID of the `agent.result` event                  |

## Results folder convention

```
$AGENTS_RESULTS_DIR/
  agent/
    result.json          # { agent, sessionId, finalMessage, metrics }
  tests/
    unit/
      result.json        # { outcome: "success"|"failure" }
      output.txt
  lint/
    oxlint/
      result.json
      output.txt
```

`result.json` always has at least `{ outcome: "success"|"failure" }`. The finish phase globs `*/*/result.json` (skipping `agent/`) to build a `checks[]` array and reads `agent/result.json` for metrics.

## Workflow pattern

```
actions/checkout
oven-sh/setup-bun + bun install
./actions/agent/workflow          <- sets up branch, results dir, emits agent.started
<agent step>                       <- claude-code-action, codex-action, etc.
./actions/agent/<name>             <- writes agent/result.json, emits agent.result
./.github/actions/test             <- runs tests, writes tests/{name}/result.json
./.github/actions/lint             <- runs lint, writes lint/{name}/result.json
[post] ./actions/agent/workflow   <- commits, pushes, creates PR, aggregates results, emits agent.completed
```

## Event types

```
agent.started
  -> agent.result       (child of AGENTS_WORKFLOW_EVENT_ID)
agent.completed         (parentEventId -> agent.started)
```

## Adding a new agent

1. Create `actions/agent/<name>/action.yml` — write `$AGENTS_RESULTS_DIR/agent/result.json`, emit `agent.result` via `./actions/event/emit` with `agent` and `finalMessage` in `data`, upload any execution artifact via `./actions/artifact/upload`
2. Create `.github/workflows/<name>-implement.yml` following the workflow pattern above
3. No changes needed to `agents/workflow` itself
