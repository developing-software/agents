# actions/

Reusable GitHub Actions for AI-driven implementation workflows. The core idea: a generic `implement` harness wraps any AI agent — the harness handles the workflow scaffolding (branch, commit, PR, metrics, API events), while the agent does the code work.

## Design principles

- **Agent-agnostic** — `implement-metrics` has zero knowledge of Claude, Codex, or any specific agent. Agents run as plain workflow steps between `implement-metrics`'s main and post phases.
- **Composable** — each action has one responsibility. Metric collection, artifact staging, and artifact upload are separate actions composed in the workflow.
- **Convention over config** — actions communicate via env vars (`IMPLEMENT_METRICS`, `IMPLEMENT_ARTIFACT_DIR`) rather than outputs, so any shell step can participate.

## Actions

### `implement-metrics`

The core harness. Runs as a `node20` action with a `main` and `post` entrypoint.

- **main** (`src/main.ts`): creates the implementation branch, exports `IMPLEMENT_METRICS` and `IMPLEMENT_EVENT_ID`, writes initial metrics (`harness`, `model`), posts `implement.started` event to the Agents API
- **post** (`src/post.ts`): commits and pushes agent changes, creates the PR, posts `implement.completed` event with diff stats and duration

The post step always runs (`post-if: always()`), even if the agent step fails.

### `write-metric`

Appends a single `key=value` line to `$IMPLEMENT_METRICS`. Used by `collect-*-metrics` actions to record agent-specific data (tokens, cost, session ID, etc.) without coupling `implement` to any agent.

### `collect-claude-metrics`

Runs **after** `anthropics/claude-code-action`. Takes `execution_file` and `session_id` outputs from the Claude step. Parses token usage and cost from the execution JSON, writes each field via `write-metric`, and stages `execution.json` into `$IMPLEMENT_ARTIFACT_DIR`.

### `collect-codex-metrics`

Runs **after** `openai/codex-action`. Takes `final_message` output from the Codex step, writes it as the `result` metric, and creates `$IMPLEMENT_ARTIFACT_DIR` (no execution file for Codex).

### `upload-implement-artifacts`

Uploads files from `$IMPLEMENT_ARTIFACT_DIR` (and `$IMPLEMENT_METRICS`) to the Agents API R2 bucket via `POST /events/:id/artifacts`, using `$IMPLEMENT_EVENT_ID` as the event. Requires `agents_token` input. Skips silently if `IMPLEMENT_EVENT_ID` is not set.

### `emit-event`

Posts a generic event to the Agents API during a workflow and returns the created `event_id` as an output. Uses `GITHUB_REPOSITORY` as the repository reference, accepts `type`, `origin`, optional concrete `tags`, optional `parent_event_id`, and JSON `data`, and exports the created event id to an env var so later steps can chain off it by default.

## Env var conventions

| Variable                 | Set by                   | Read by                                      | Purpose                                                          |
| ------------------------ | ------------------------ | -------------------------------------------- | ---------------------------------------------------------------- |
| `IMPLEMENT_METRICS`      | `implement-metrics` main | `write-metric`, `upload-implement-artifacts` | Path to the `key=value` metrics file                             |
| `IMPLEMENT_EVENT_ID`     | `implement-metrics` main | `upload-implement-artifacts`                 | ID of the `implement.started` event; used as the artifact target |
| `IMPLEMENT_ARTIFACT_DIR` | `collect-*-metrics`      | `upload-implement-artifacts`                 | Dir of agent-specific files to upload (e.g. `execution.json`)    |

## Workflow pattern

A standard agent implementation workflow follows this shape:

```
actions/checkout
oven-sh/setup-bun + bun install
./actions/implement-metrics           ← sets up branch, exports IMPLEMENT_METRICS + IMPLEMENT_EVENT_ID
<agent step>                          ← claude-code-action, codex-action, etc. — modifies files only
./actions/collect-*-metrics           ← captures agent metrics, stages files → IMPLEMENT_ARTIFACT_DIR
./actions/upload-implement-artifacts  ← uploads IMPLEMENT_ARTIFACT_DIR + IMPLEMENT_METRICS to R2 via API
./.github/actions/test                ← runs tests on the agent's changes
[post] ./actions/implement-metrics    ← commits, pushes, creates PR, posts implement.completed event
```

## Adding a new agent

1. Create `actions/collect-<agent>-metrics/action.yml` — write relevant metrics via `./actions/write-metric`, copy any execution file into `$RUNNER_TEMP/implement-artifacts/`, export `IMPLEMENT_ARTIFACT_DIR`
2. Create `.github/workflows/<agent>-implement.yml` following the pattern above
3. No changes needed to `implement-metrics` itself
