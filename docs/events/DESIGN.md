# Event System Design

Events are the backbone of observability in this system. Every meaningful action — agent runs, git-provider webhooks, console operations — emits an event that flows through a single schema into Postgres.

## Event Shape

```ts
{
  id: string               // ULID, auto-generated
  parentEventId: string?   // Links to parent event (chain/tree)
  source: string?          // Entity type (e.g., "repository")
  sourceId: string?        // Entity ID (ULID reference, no FK)
  type: string             // Event type (e.g., "agent")
  origin: OriginType       // Where the event came from
  tags: string[]           // Filterable, searchable labels
  data: Record<string, unknown>  // Arbitrary payload (open schema)
  timeCreated: string      // ISO timestamp
}
```

## Origins

| Origin    | Description                                              |
| --------- | -------------------------------------------------------- |
| `action`  | GitHub Actions workflows (agent runs, event/emit action) |
| `webhook` | Git-provider webhook handlers (issues, PRs, pushes)      |
| `console` | Console server-side commands (triage, review, judge)     |
| `cli`     | CLI tools (reserved, not actively used)                  |
| `api`     | Direct API posts (reserved)                              |
| `cron`    | Scheduled tasks (reserved)                               |

## Event Types

### Agent Lifecycle

| Type    | Origin | Description                                                                 |
| ------- | ------ | --------------------------------------------------------------------------- |
| `agent` | action | Agent workflow event — created on setup, updated on teardown with full data |

### Provider Webhooks

| Type                           | Origin  | Description                                   |
| ------------------------------ | ------- | --------------------------------------------- |
| `github.issues.{action}`        | webhook | GitHub issue opened, closed, reopened, labeled, etc.  |
| `github.pull_request.{action}`  | webhook | GitHub PR opened, closed, synchronize, etc.           |
| `github.push`                   | webhook | GitHub push to a branch                               |
| `forjero.issues.{action}`       | webhook | Forgejo issue opened, closed, reopened, labeled, etc. |
| `forjero.pull_request.{action}` | webhook | Forgejo PR opened, closed, synchronize, etc.          |
| `forjero.push`                  | webhook | Forgejo push to a branch                              |

### Console Operations

| Type                           | Origin  | Description                                             |
| ------------------------------ | ------- | ------------------------------------------------------- |
| `github.issue.triaged`         | console | AI classification of an issue (type, scope, actionable) |
| `github.pull_request.reviewed` | console | AI review of a PR against a plan                        |
| `plan.evaluated`               | console | AI comparison of multiple implementations               |

### Checks (CI)

| Type     | Origin | Description                                                         |
| -------- | ------ | ------------------------------------------------------------------- |
| `checks` | action | CI check event — created on setup, updated on teardown with results |

Typed schema: `ChecksEvent.Completed.Data` in `packages/core/src/events/checks/index.ts`. Includes checks (with outcomes and summaries) and workflow metadata.

### Infrastructure

| Type    | Origin | Description |
| ------- | ------ | ----------- |
| `audit` | action | Audit event |

### Deployments

| Type            | Origin | Description                                                          |
| --------------- | ------ | -------------------------------------------------------------------- |
| `deploy`        | action | Deploy event — created on setup, updated on teardown with outputs/PR |
| `deploy.remove` | action | Teardown event — created on setup, updated on teardown               |

Standard tags: `env:<stage>`, `tool:<name>` (e.g. `sst`), `git:branch:<head>` on PR runs, plus all auto-injected `git:*` tags from `event/init`.

Typed schema: `DeployEvent.Completed.Data` in `packages/core/src/events/deploy/index.ts`.

## Event Chains

Events form trees via `parentEventId`. Agent events are single nodes — created at workflow start and updated at teardown with full data.

Parent inference works via tag matching — when `parentEventId` isn't explicit, `Event.inferParentEventId()` finds existing events with matching `git:pr:`, `git:issue:`, or `git:workflow:` tags within the same `source` and `sourceId`.

Git tags are produced and consumed through `Tags.Git.*` in `packages/core/src/events/tag/index.ts`. Use:

- `Tags.Git.parse(tag)` to parse a single tag
- `Tags.Git.list(tags)` to parse all git tags from a tag list
- `Tags.Git.find(tags, kind)` to get the first matching git tag
- `Tags.Git.collect(tags, kind)` to get all matches, such as multiple `git:issue:*` tags on a plan

## Tags vs Data

Tags and data serve different purposes. Getting this wrong makes events hard to query or bloated.

### Tags: for filtering and grouping

Tags are **small, categorical, deterministic values** used for search and aggregation:

```
git:provider:github         # git provider
git:repo:github:owner/name  # repository reference
git:issue:42                # issue number
git:pr:15                   # pull request number
git:branch:main             # branch name
git:workflow:12345          # GitHub Actions run ID
env:production         # environment / base branch
harness:claude         # agent harness name
model:claude-sonnet-4-20250514  # LLM model identifier
plan:01JABCDEF         # plan ID
type:bug               # issue classification
scope:small            # issue scope
check:tests/unit:success  # check outcome
```

**Good tag values:** single word, short identifier, number, enum value.

### Data: for payload content

Data holds **everything that is NOT small and simple:**

- Strings longer than ~50 chars (`finalMessage`, `errorMessage`, `stackTrace`)
- Nested objects (`metrics`, `checks`)
- Arrays
- Numeric measurements (`durationMs`, `linesAdded`, `cost_usd`)
- URLs (`prUrl`, `runUrl`)

### Anti-patterns

| Anti-pattern                         | Why it's bad                      | Fix                           |
| ------------------------------------ | --------------------------------- | ----------------------------- |
| Long string as a tag                 | Bloats tag index, not filterable  | Move to `data`                |
| Categorical value only in `data`     | Can't filter/group by it          | Also add as a tag             |
| Numeric metric as a tag              | Tags are strings, can't aggregate | Put in `data`                 |
| Redundant tag + data without purpose | Confusing, maintenance burden     | Pick one or document why both |

### Decision guide

```
Is it a short identifier, enum, or number you'd filter/group by?
  → Tag (e.g., harness:claude, model:gpt-4o, git:issue:42)

Is it a measurement, long string, object, or array?
  → Data (e.g., cost_usd, finalMessage, checks)

Is it categorical AND you also need it in the payload for display?
  → Both tag AND data (e.g., model is a tag for filtering + in data for display)
```

## Data Convention

Event data uses an **open schema**. Any action can write any key. The event's data is assembled from `data.json` files in the results directory — the teardown recursively walks the directory tree and builds a nested object, then merges it into the event via `PATCH /events/:id`.

These keys are conventions, not enforced schemas. Any action can write additional keys via `event/data`.

## Typed Event Schemas

Event data schemas are defined as **self-contained Zod modules** in `packages/core/src/events/{type}/index.ts`. Each module exports a namespace following the `{Type}Event` convention, with subnamespaces per lifecycle phase:

- `AgentEvent.Completed.Data` — full `agent` event body schema
- `AgentEvent.Completed.parse(raw)` — never throws, returns typed defaults for missing/invalid fields
- `AgentEvent.resolveAgent(name)` — normalizes agent name aliases (e.g. `"claude"` → `"claude-code"`)

**Convention:** `{Type}Event.{Phase}.Data` is the composed Zod schema for a specific event. Shared utilities like alias resolution live on the parent namespace. Other event types follow the same pattern (e.g. `TestsEvent.Completed.Data`, `LintEvent.Completed.Data`).

**Constraints:** These modules import only `zod` — no DB, drizzle, or internal dependencies. This allows them to be used by both `@agents/core` consumers and GitHub Actions.

**Source of truth:** See `packages/core/src/events/agent/index.ts` for the `agent` event schema, including agent/metrics/pricing/workflow/diff/pr/checks fields.

## Data Schemas by Event Type

### agent

Created on setup with initial data (`runUrl`, `trigger`), then updated on teardown with full data.

Typed schema: `AgentEvent.Completed.Data` in `packages/core/src/events/agent/index.ts`. Includes agent info, metrics, pricing, workflow, diff, PR, and checks.

### github.issues.{action}

```ts
data: {
  title: string,
  state: string,
  labels: string[],
  body: string,
}
```

### github.pull_request.{action}

```ts
data: {
  title: string,
  state: string,
  headBranch: string,
  baseBranch: string,
}
```

### github.push

```ts
data: {
  branch: string,
  commitCount: number,
  lastCommit: string,
  pusher: string,
}
```

### github.issue.triaged

```ts
data: {
  type: string,       // bug, feature, task, question
  scope: string,      // trivial, small, medium, large
  actionable: boolean,
  reasoning: string,
}
```

### deploy

Created on setup with initial data, updated on teardown with full data.

```ts
data: {
  stage: string,
  tool: string,                    // "sst", "terraform", …
  outputs: Record<string, string>, // keys come from infra (api, auth, console, …)
  pr?: {                           // present only on pull_request runs
    number: number,
    title: string,
    author: string,
    headRef: string,
    baseRef: string,
    headSha: string,
    url: string,
  },
  workflow: { durationMs, runUrl, trigger, conclusion, jobs },
}
```

A PR comment with marker `<!-- deploy:<tool> -->` is upserted with a table of `outputs`. On `deploy.remove`, the same comment is deleted.

### deploy.remove

Same shape as `deploy`, except `outputs` is omitted (no URLs post-teardown).
