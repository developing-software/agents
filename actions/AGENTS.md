# actions/

Reusable GitHub Actions for AI-driven implementation workflows. The core idea: a generic `workflow/run` harness wraps any AI agent — the harness handles workflow scaffolding (branch, commit, PR, context tags, API events), while the agent does the code work.

## Design principles

- **Agent-agnostic** — `workflow/run` has zero knowledge of Claude, Codex, or any specific agent. Agents run as plain workflow steps between `workflow/run`'s main and post phases.
- **Composable** — each action has one responsibility. Tag collection, event emission, and artifact upload are separate actions composed in the workflow.
- **Context tags** — actions communicate shared observable data via `AGENTS_CONTEXT_TAGS_FILE`. Each line is a tag (`namespace:key:value`). All `event/emit` calls inherit these tags automatically.
- **Emit vs tag** — use `event/emit` for distinct observable state changes; use `event/tag` to accumulate measurements and references onto the workflow context.

## Structure

```
actions/
  core/           — shared TypeScript utilities for Node20 actions
  workflow/
    run/          — harness: branch setup + PR creation + lifecycle events
  agent/
    claude/       — collect Claude Code metrics into context tags + emit agents.claude.result
    codex/        — collect Codex result + emit agents.codex.result
  event/
    emit/         — post an event to the Agents API (inherits context tags by default)
    tag/          — append a tag to the workflow context
  artifact/
    upload/       — upload a file or directory to the Agents API under the workflow event
```

## Actions

### `workflow/run`

The core harness. Runs as a `node20` action with `main` and `post` entrypoints.

- **main** (`src/start.ts`): creates the implementation branch, initialises `AGENTS_CONTEXT_TAGS_FILE` with repo/issue/run/branch/harness/model tags, exports `AGENTS_WORKFLOW_EVENT_ID`, posts `agents.implement.started` event
- **post** (`src/finish.ts`): commits and pushes agent changes, creates the PR, appends `gh:pr:N` and diff metric tags to context, posts `agents.implement.completed` with the full inherited context

The post step always runs (`post-if: always()`), even if the agent step fails.

### `event/tag`

Appends a tag to `$AGENTS_CONTEXT_TAGS_FILE`. Accepts either a full `tag` string or a `key`+`value` shorthand (formatted as `metric:key:value`). No-op if `AGENTS_CONTEXT_TAGS_FILE` is not set.

### `event/emit`

Posts an event to the Agents API. By default reads `$AGENTS_CONTEXT_TAGS_FILE` and merges all context tags into the event (`inherit_context: 'true'`). Pass `inherit_context: 'false'` to emit an event without inheriting context. Exports the created event ID to `event_id_env` (default: `EVENT_ID`).

### `agent/claude`

Runs **after** `anthropics/claude-code-action`. Parses token usage and cost from the execution JSON, writes each field as `metric:*` tags to context, then emits `agents.claude.result` with `{"finalMessage": "..."}` in the event data (exports `CLAUDE_EVENT_ID`). Uploads `claude_code_execution.json` to the Agents API.

### `agent/codex`

Runs **after** `openai/codex-action`. Emits `agents.codex.result` with `{"finalMessage": "..."}` in the event data (exports `CODEX_EVENT_ID`).

### `artifact/upload`

Uploads a file or directory to the Agents API R2 bucket via `POST /events/:id/artifacts`, using `$AGENTS_WORKFLOW_EVENT_ID` as the event. Accepts a `path` (file or directory) and an optional `name` override (single-file only). Skips silently if `AGENTS_WORKFLOW_EVENT_ID` is not set.

## Env var conventions

| Variable                   | Set by               | Read by                                                     | Purpose                                         |
| -------------------------- | -------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| `AGENTS_CONTEXT_TAGS_FILE` | `workflow/run` start | `event/emit`, `event/tag`, `agent/*`, `workflow/run` finish | Path to the tag context file (one tag per line) |
| `AGENTS_WORKFLOW_EVENT_ID` | `workflow/run` start | `artifact/upload`, `agent/*`, `workflow/run` finish         | ID of the `agents.implement.started` event      |
| `CLAUDE_EVENT_ID`          | `agent/claude`       | downstream steps                                            | ID of the `agents.claude.result` event          |
| `CODEX_EVENT_ID`           | `agent/codex`        | downstream steps                                            | ID of the `agents.codex.result` event           |

## Workflow pattern

```
actions/checkout
oven-sh/setup-bun + bun install
./actions/workflow/run           ← sets up branch, exports context env vars, emits agents.implement.started
<agent step>                     ← claude-code-action, codex-action, etc. — modifies files only
./actions/agent/<name>           ← writes metric: tags, emits agents.<name>.result, uploads execution artifact
./.github/actions/test           ← runs tests; writes metric:tests tag; uploads test-output.txt on failure
[post] ./actions/workflow/run    ← commits, pushes, creates PR, appends gh:pr + diff metrics, emits agents.implement.completed
```

## Tag context flow

```
workflow/run (start)
  → AGENTS_CONTEXT_TAGS_FILE:
      gh:repo:owner/repo
      gh:issue:42
      gh:branch:claude/issue-42-...
      gh:run:${runId}
      harness:claude-code
      model:claude-sonnet-4-6
  → emits: agents.implement.started

agent/claude
  → appends to AGENTS_CONTEXT_TAGS_FILE:
      metric:session_id:abc123
      metric:input_tokens:5000
      metric:output_tokens:1200
      metric:cache_read_input_tokens:800
      metric:num_turns:3
      metric:cost_usd:0.042
  → emits: agents.claude.result { finalMessage: "..." }  (child of AGENTS_WORKFLOW_EVENT_ID)
  → uploads: claude_code_execution.json

.github/actions/test
  → appends: metric:tests:success
  → on failure: uploads test-output.txt

workflow/run (finish)
  → appends: gh:pr:999, metric:duration_ms:45000, metric:lines_added:150, metric:lines_removed:30
  → emits: agents.implement.completed (inherits all of the above)
```

## Event hierarchy

```
agents.implement.started
└── agents.claude.result        (or agents.codex.result)
agents.implement.completed
```

`started` and `completed` are siblings at the root (completed has `parentEventId` pointing to `started`). Agent result events are children of the workflow event.

## Adding a new agent

1. Create `actions/agent/<name>/action.yml` — append relevant `metric:*` tags via `./actions/event/tag`, emit `agents.<name>.result` via `./actions/event/emit` with `finalMessage` in `data`, upload any execution artifact via `./actions/artifact/upload`
2. Create `.github/workflows/<name>-implement.yml` following the workflow pattern above
3. No changes needed to `workflow/run` itself
