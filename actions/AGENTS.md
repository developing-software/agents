# actions/

Reusable GitHub Actions for observable workflows. The core idea: `event/init` provides a generic lifecycle harness that any workflow can adopt for rich observability — metadata collection, tag aggregation, and event emission. Agent workflows are composed from small, single-purpose actions.

## Architecture

```
                        Workflow Step Execution
                        ======================

  event/init (setup)                              event/init (teardown)
  ==================                              =====================
  |                                               |
  | Creates:                                      | Reads:
  |   DEV_AGENTS_RESULTS_DIR/                     |   checks: {cat}/{name}/result.json
  |     metadata/                                 |   metadata: metadata/{key}/data.json
  |   DEV_AGENTS_TAGS_DIR/                        |   tags: DEV_AGENTS_TAGS_DIR/*
  |                                               |
  | Exports env:                                  | Emits:
  |   DEV_AGENTS_TOKEN                            |   {type}.completed
  |   DEV_AGENTS_API_URL                          |     { durationMs, runUrl,
  |   DEV_AGENTS_RESULTS_DIR                      |       checks: [...],
  |   DEV_AGENTS_TAGS_DIR                         |       metadata: {...} }
  |   DEV_AGENTS_RUN_URL                          |
  |   DEV_AGENTS_EVENT_ID                         |
  |                                               |
  | Writes initial tags:                          |
  |   gh-repo, gh-run, gh-branch/gh-pr           |
  |   + user-provided tags                        |
  |                                               |
  | Emits:                                        |
  |   {type}.started                              |
  |                                               |
  +---> [workflow steps run here] ----------------+

                    Results Dir Layout
                    ==================

  $DEV_AGENTS_RESULTS_DIR/
    tests/unit/result.json            <-- check (from event/result)
    lint/oxlint/result.json           <-- check (from event/result)
    typecheck/tsc/result.json         <-- check (from event/result)
    metadata/
      agent/data.json                 <-- metadata (from agent/claude, etc.)
      branch/data.json                <-- metadata (from git/branch)
      diff/data.json                  <-- metadata (from git/commit)
      pr/data.json                    <-- metadata (from git/pr)

                    Tags Dir Layout
                    ================

  $DEV_AGENTS_TAGS_DIR/
    gh-repo              "gh:repo:owner/repo"
    gh-run               "gh:run:123456"
    gh-branch            "gh:branch:claude/issue-42-123"
    harness              "harness:claude-code"
    model                "model:claude-sonnet-4-6"
    check-tests-unit     "check:tests/unit:success"
    check-lint-oxlint    "check:lint/oxlint:success"
    gh-pr                "gh:pr:99"
```

## Design Principles

- **Generic lifecycle** -- `event/init` knows nothing about agents, git, or PRs. It creates a results dir and tags dir, emits `{type}.started`, and on teardown aggregates whatever checks and metadata were written by any steps.
- **Composable** -- each action has one job. Branch creation, committing, PR creation, commenting, result writing, tagging, and event emission are all separate.
- **Env-based token** -- `event/init` exports `DEV_AGENTS_TOKEN` so downstream actions pick it up automatically. No need to pass `token:` to every step.
- **Directory-based tags** -- tags are flat files in `DEV_AGENTS_TAGS_DIR`. The filename is a slug, the content is the full tag string. Writing the same slug overwrites, preventing duplicates.
- **Results folder** -- steps write structured data into `DEV_AGENTS_RESULTS_DIR`. Two concepts: **checks** (`{category}/{name}/result.json`) and **metadata** (`metadata/{key}/data.json`). The teardown aggregates both.

## Structure

```
actions/
  event/
    init/             Node.js pre/post: lifecycle setup + teardown
    emit/             Post an event to the Agents API
    tag/              Write a tag file to the context
    result/           Write a check result + auto-tag
    metadata/         Write structured metadata
  git/
    branch/           Create + push a working branch
    commit/           Stage, commit, push, compute diff metrics
    pr/               Create a PR, write PR metadata + tag
  comment/
    create/           Post an issue comment, export comment ID
    update/           Update an issue comment with status
  agent/
    claude/           Collect Claude Code metrics -> metadata/agent
    opencode/         Collect OpenCode metrics -> metadata/agent
    codex/            Collect Codex metrics -> metadata/agent
  artifact/
    upload/           Upload a file to the Agents API R2 storage
  core/               Shared TypeScript utilities for Node20 actions
```

## Actions

### `event/init`

The core lifecycle harness. Node.js action with `main` (setup) and `post` (teardown).

**Setup** (runs first):
- Creates `DEV_AGENTS_RESULTS_DIR` and `DEV_AGENTS_TAGS_DIR`
- Exports `DEV_AGENTS_TOKEN` and `DEV_AGENTS_API_URL` to env for all downstream steps
- Writes GitHub context tags (repo, run, branch/PR)
- Writes user-provided tags
- Emits `{type}.started` event

**Teardown** (runs last, always):
- Walks results dir: non-`metadata/` dirs as checks, `metadata/{key}/data.json` as structured metadata
- Reads all tags from `DEV_AGENTS_TAGS_DIR`
- Emits `{type}.completed` with `{ durationMs, runUrl, checks, metadata }`

The teardown is fully agnostic -- it has no knowledge of agents, git, or PRs.

### `event/emit`

Posts an event to the Agents API. Inherits context tags from `DEV_AGENTS_TAGS_DIR` by default. Falls back to `DEV_AGENTS_TOKEN` env if no `token` input is provided.

### `event/tag`

Writes a single tag file to `DEV_AGENTS_TAGS_DIR`. Takes `slug` (filename) and `value` (full tag string). Writing the same slug overwrites.

### `event/result`

Writes a check result to the results folder and auto-tags the context. After writing `{category}/{name}/result.json`, writes a `check:{category}/{name}:{outcome}` tag. Also live-updates the issue comment if `DEV_AGENTS_COMMENT_ID` is set.

### `event/metadata`

Writes arbitrary structured JSON to `metadata/{key}/data.json` in the results folder.

### `git/branch`

Creates and pushes a working branch. Names it `{prefix}/issue-{N}-{runId}` (with issue) or `{prefix}/run-{runId}` (without). Exports `DEV_AGENTS_BRANCH` and `DEV_AGENTS_INITIAL_SHA`. Writes branch metadata and tags.

### `git/commit`

Stages changes, detects if the agent already committed (via `DEV_AGENTS_INITIAL_SHA`), commits if needed, pushes, and computes diff metrics. Writes `metadata/diff/data.json`.

### `git/pr`

Creates a PR (idempotent). Auto-generates title and body from prefix + issue number. Writes `gh-pr` tag and `metadata/pr/data.json`.

### `comment/create`

Posts a comment on a GitHub issue. Auto-generates a progress comment if no body is provided. Exports `DEV_AGENTS_COMMENT_ID` for subsequent updates.

### `comment/update`

Updates the comment identified by `DEV_AGENTS_COMMENT_ID`. Auto-generates a status body from the results dir (checks, PR, diff metrics) if no body is provided.

### `agent/claude`

Runs after `anthropics/claude-code-action`. Extracts token usage, cost, and session info from the execution JSON. Writes `metadata/agent/data.json`. Uploads the execution file as an artifact.

### `agent/opencode`

Runs after `anomalyco/opencode/github`. Extracts metrics from the OpenCode session export. Writes `metadata/agent/data.json`. Uploads the session file as an artifact.

### `agent/codex`

Runs after `openai/codex-action`. Extracts metrics from the Codex session JSONL. Writes `metadata/agent/data.json`. Uploads the session file as an artifact.

### `artifact/upload`

Uploads a file or directory to the Agents API R2 storage under the current event. Falls back to `DEV_AGENTS_TOKEN` and `DEV_AGENTS_EVENT_ID` from env.

## Env Var Conventions

| Variable | Set by | Purpose |
|---|---|---|
| `DEV_AGENTS_TOKEN` | `event/init` | Agents API token, inherited by all downstream actions |
| `DEV_AGENTS_API_URL` | `event/init` | Agents API base URL |
| `DEV_AGENTS_RESULTS_DIR` | `event/init` | Path to results folder for checks and metadata |
| `DEV_AGENTS_TAGS_DIR` | `event/init` | Path to tags directory (one file per tag) |
| `DEV_AGENTS_RUN_URL` | `event/init` | GitHub Actions run URL |
| `DEV_AGENTS_EVENT_ID` | `event/init` | ID of the `{type}.started` event |
| `DEV_AGENTS_BRANCH` | `git/branch` | Name of the created working branch |
| `DEV_AGENTS_INITIAL_SHA` | `git/branch` | SHA before agent changes (for commit detection) |
| `DEV_AGENTS_COMMENT_ID` | `comment/create` | Issue comment ID for live updates |
| `DEV_AGENTS_HARNESS` | workflow (manual) | Agent harness name, used in comments |

## Event Types

```
{type}.started      emitted by event/init setup
{type}.completed    emitted by event/init teardown (parent: started event)
  data: { durationMs, runUrl, checks: [...], metadata: {...} }

lint.started        emitted by .github/actions/lint
lint.completed      emitted by .github/actions/lint (parent: lint.started)

tests.started       emitted by .github/actions/test
tests.completed     emitted by .github/actions/test (parent: tests.started)

typecheck.started   emitted by .github/actions/typecheck
typecheck.completed emitted by .github/actions/typecheck (parent: typecheck.started)
```

## Composed Agent Workflow

```
actions/checkout
oven-sh/setup-bun + bun install
./actions/event/init            sets up lifecycle, exports token to env
./actions/git/branch            creates working branch
./actions/comment/create        posts progress comment on issue
<agent step>                    claude-code-action, codex-action, etc.
./actions/agent/<name>          writes metadata/agent/data.json
./.github/actions/check         runs lint + typecheck + tests, writes results + auto-tags
./actions/git/commit            commits, pushes, writes diff metadata
./actions/git/pr                creates PR, writes PR metadata + tag
./actions/comment/update        updates comment with final status
[auto] event/init teardown      aggregates everything, emits {type}.completed
```

## Standalone CI Workflow

```
actions/checkout
oven-sh/setup-bun + bun install
./actions/event/init            type: ci, exports token to env
./.github/actions/check         runs lint + typecheck + tests, writes results + auto-tags
[auto] event/init teardown      emits ci.completed with check results
```

## Adding a New Agent

1. Create `actions/agent/<name>/action.yml` -- extract metrics from agent output, write `metadata/agent/data.json` via `$DEV_AGENTS_RESULTS_DIR`, upload any session artifact via `artifact/upload`
2. Create `.github/workflows/agent-<name>.yml` following the composed agent workflow pattern
3. No changes needed to `event/init` or any other infrastructure action
