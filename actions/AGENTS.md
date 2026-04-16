# actions/

Reusable GitHub Actions for observable workflows. The core idea: `event/init` provides a generic lifecycle harness that any workflow can adopt for rich observability — data collection, tag aggregation, and event emission. Agent workflows are composed from small, single-purpose actions.

## Architecture

```
                        Workflow Step Execution
                        ======================

  event/init (setup)                              event/init (teardown)
  ==================                              =====================
  |                                               |
  | Creates:                                      | Reads:
  |   DEV_AGENTS_RESULTS_DIR/                     |   Recursively walks for data.json
  |   DEV_AGENTS_TAGS_DIR/                        |   tags: DEV_AGENTS_TAGS_DIR/*
  |                                               |
  | Exports env:                                  | Emits:
  |   DEV_AGENTS_TOKEN                            |   {type}.completed
  |   DEV_AGENTS_API_URL                          |     { workflow: {durationMs, runUrl},
  |   DEV_AGENTS_RESULTS_DIR                      |       ...all data.json entries }
  |   DEV_AGENTS_TAGS_DIR                         |
  |   DEV_AGENTS_RUN_URL                          |
  |   DEV_AGENTS_EVENT_ID                         |
  |                                               |
  | Writes initial tags:                          |
  |   git-provider, git-repo, git-workflow,       |
  |   git-branch/git-pr                           |
  |   + user-provided tags                        |
  |                                               |
  | Emits:                                        |
  |   {type}.started                              |
  |                                               |
  +---> [workflow steps run here] ----------------+

                    Results Dir Layout
                    ==================

  $DEV_AGENTS_RESULTS_DIR/
    agent/data.json                 <-- data (from agent/claude, etc.)
    diff/data.json                  <-- data (from git/commit)
    pr/data.json                    <-- data (from git/pr)
    branch/data.json                <-- data (from git/branch)
    checks/
      tests/unit/data.json          <-- data (from event/data)
      lint/oxlint/data.json         <-- data (from event/data)
      typecheck/tsc/data.json       <-- data (from event/data)

                    Tags Dir Layout
                    ================

  $DEV_AGENTS_TAGS_DIR/
    git-provider         "git:provider:github"
    git-repo             "git:repo:github:owner/repo"
    git-workflow         "git:workflow:123456"
    git-branch           "git:branch:claude/issue-42-123"
    harness              "harness:claude-code"
    model                "model:claude-sonnet-4-6"
    check-tests-unit     "check:tests/unit:success"
    check-lint-oxlint    "check:lint/oxlint:success"
    git-pr               "git:pr:99"
```

## Design Principles

- **Generic lifecycle** -- `event/init` knows nothing about agents, git, or PRs. It creates a results dir and tags dir, emits `{type}.started`, and on teardown recursively walks `data.json` files to assemble the event data.
- **Composable** -- each action has one job. Branch creation, committing, PR creation, commenting, data writing, tagging, and event emission are all separate.
- **Env-based token** -- `event/init` exports `DEV_AGENTS_TOKEN` so downstream actions pick it up automatically. No need to pass `token:` to every step.
- **Directory-based tags** -- tags are flat files in `DEV_AGENTS_TAGS_DIR`. The filename is a slug, the content is the full tag string. Writing the same slug overwrites, preventing duplicates.
- **Convention: data.json** -- any directory containing `data.json` in the results dir becomes a data entry. Nested directories create nested objects in the event data. This is fully generic — no special-casing for checks, metadata, or any other concept.

## Structure

```
actions/
  event/
    init/             Node.js pre/post: lifecycle setup + teardown
    emit/             Post an event to the Agents API
    tag/              Write a tag file to the context
    data/             Write structured data to the results folder
  git/
    branch/           Create + push a working branch
    commit/           Stage, commit, push, compute diff metrics
    pr/               Create a PR, write PR data + tag
  comment/
    create/           Post an issue comment, export comment ID
    update/           Update an issue comment with status
  agent/
    claude/           Collect Claude Code metrics -> agent/data.json
    opencode/         Collect OpenCode metrics -> agent/data.json
    codex/            Collect Codex metrics -> agent/data.json
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

- Recursively walks results dir for `data.json` files — nested directories create nested objects
- Reads all tags from `DEV_AGENTS_TAGS_DIR`
- Emits `{type}.completed` with `{ workflow: {durationMs, runUrl}, ...data }`

The teardown is fully agnostic — it has no knowledge of agents, git, checks, or PRs.

### `event/emit`

Posts an event to the Agents API. Inherits context tags from `DEV_AGENTS_TAGS_DIR` by default. Falls back to `DEV_AGENTS_TOKEN` env if no `token` input is provided.

### `event/tag`

Writes a single tag file to `DEV_AGENTS_TAGS_DIR`. Takes `slug` (filename) and `value` (full tag string). Writing the same slug overwrites.

### `event/data`

Writes structured data to the results folder. Takes `key` (path — slashes create nested directories), `data` (JSON string), optional `tag` (auto-writes to tags dir), and optional `output` (file to copy alongside data.json).

```yaml
# Write agent data:
- uses: ./actions/event/data
  with:
    key: agent
    data: '{"name": "claude-code", "metrics": {...}}'

# Write a check result with auto-tag:
- uses: ./actions/event/data
  with:
    key: checks/tests/unit
    data: '{"outcome": "success"}'
    tag: check:tests/unit:success
```

### `git/branch`

Creates and pushes a working branch. Names it `{prefix}/issue-{N}-{runId}` (with issue) or `{prefix}/run-{runId}` (without). Exports `DEV_AGENTS_BRANCH` and `DEV_AGENTS_INITIAL_SHA`. Writes branch data and tags.

### `git/commit`

Stages changes, detects if the agent already committed (via `DEV_AGENTS_INITIAL_SHA`), commits if needed, pushes, and computes diff metrics. Writes `diff/data.json`.

### `git/pr`

Creates a PR (idempotent). Auto-generates title and body from prefix + issue number. Writes `git-pr` tag and `pr/data.json`.

### `comment/create`

Posts a comment on a GitHub issue. Auto-generates a progress comment if no body is provided. Exports `DEV_AGENTS_COMMENT_ID` for subsequent updates.

### `comment/update`

Updates the comment identified by `DEV_AGENTS_COMMENT_ID`. Auto-generates a status body from the results dir (checks, PR, diff data) if no body is provided.

### `agent/claude`

Runs after `anthropics/claude-code-action`. Extracts token usage, cost, and session info from the execution JSON. Writes `agent/data.json`. Uploads the execution file as an artifact.

### `agent/opencode`

Runs after `anomalyco/opencode/github`. Extracts metrics from the OpenCode session export. Writes `agent/data.json`. Uploads the session file as an artifact.

### `agent/codex`

Runs after `openai/codex-action`. Extracts metrics from the Codex session JSONL. Writes `agent/data.json`. Uploads the session file as an artifact.

### `artifact/upload`

Uploads a file or directory to the Agents API R2 storage under the current event. Falls back to `DEV_AGENTS_TOKEN` and `DEV_AGENTS_EVENT_ID` from env.

## Env Var Conventions

| Variable                 | Set by            | Purpose                                                 |
| ------------------------ | ----------------- | ------------------------------------------------------- |
| `DEV_AGENTS_TOKEN`       | `event/init`      | Agents API token, inherited by all downstream actions   |
| `DEV_AGENTS_API_URL`     | `event/init`      | Agents API base URL                                     |
| `DEV_AGENTS_RESULTS_DIR` | `event/init`      | Path to results folder for data collection              |
| `DEV_AGENTS_TAGS_DIR`    | `event/init`      | Path to tags directory (one file per tag)               |
| `DEV_AGENTS_RUN_URL`     | `event/init`      | GitHub Actions run URL                                  |
| `DEV_AGENTS_EVENT_ID`    | `event/init`      | ID of the event (created on setup, updated on teardown) |
| `DEV_AGENTS_BRANCH`      | `git/branch`      | Name of the created working branch                      |
| `DEV_AGENTS_INITIAL_SHA` | `git/branch`      | SHA before agent changes (for commit detection)         |
| `DEV_AGENTS_COMMENT_ID`  | `comment/create`  | Issue comment ID for live updates                       |
| `DEV_AGENTS_HARNESS`     | workflow (manual) | Agent harness name, used in comments                    |

## Event Types

```
{type}.started      emitted by event/init setup
{type}.completed    emitted by event/init teardown (parent: started event)
  data: { workflow: {durationMs, runUrl}, ...collected data }

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
./actions/git/branch            creates working branch, writes branch/data.json
./actions/comment/create        posts progress comment on issue
<agent step>                    claude-code-action, codex-action, etc.
./actions/agent/<name>          writes agent/data.json
./.github/actions/check         runs lint + typecheck + tests, writes checks via event/data
./actions/git/commit            commits, pushes, writes diff/data.json
./actions/git/pr                creates PR, writes pr/data.json + gh-pr tag
./actions/comment/update        updates comment with final status
[auto] event/init teardown      walks data.json files, emits {type}.completed
```

## Standalone CI Workflow

```
actions/checkout
 oven-sh/setup-bun + bun install
./actions/event/init            type: checks, exports token to env
./.github/actions/check         runs lint + typecheck + tests, writes checks via event/data
[auto] event/init teardown      updates checks event with check data
```

## Adding a New Agent

1. Create `actions/agent/<name>/action.yml` — extract metrics from agent output, write `agent/data.json` via `$DEV_AGENTS_RESULTS_DIR`, upload any session artifact via `artifact/upload`
2. Create `.github/workflows/agent-<name>.yml` following the composed agent workflow pattern
3. No changes needed to `event/init` or any other infrastructure action
