# actions/

Reusable GitHub Actions for observable workflows. The core idea: `event/init` provides a generic lifecycle harness that any workflow can adopt for rich observability — data collection, tag aggregation, and event emission. These actions are for CI events only; agent runs execute in sandboxd (see `docs/dev/architecture/agent-runs.md`).

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
    git-branch           "git:branch:dev"
    check-tests-unit     "check:tests/unit:success"
    check-lint-oxlint    "check:lint/oxlint:success"
    git-pr               "git:pr:99"
```

## Design Principles

- **Generic lifecycle** -- `event/init` knows nothing about agents, git, or PRs. It creates a results dir and tags dir, emits `{type}.started`, and on teardown recursively walks `data.json` files to assemble the event data.
- **Composable** -- each action has one job. Data writing, tagging, artifact upload, and event emission are all separate.
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
- Writes workflow context tags (provider, repo, run, branch/PR)
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

## Event Types

```
{type}.started      emitted by event/init setup
{type}.completed    emitted by event/init teardown (parent: started event)
  data: { workflow: {durationMs, runUrl}, ...collected data }
```

## CI Workflow (`.github/workflows/ci.yml`)

```
typecheck | lint | test | fallow | trivy     parallel jobs, plain steps
report (needs: all, if: always())
  ./actions/event/init            type: checks
  Record check results            writes checks/<category>/<name> from `needs.*.result`
  Summarize results               job table in step summary + PR comment
  [auto] event/init teardown      updates checks event with check data
```
