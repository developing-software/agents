# Event System Design

Events are the backbone of observability in this system. Every meaningful action — agent runs, GitHub webhooks, console operations — emits an event that flows through a single schema into Postgres.

## Event Shape

```ts
{
  id: string               // ULID, auto-generated
  parentEventId: string?   // Links to parent event (chain/tree)
  source: string?          // Entity type (e.g., "repository")
  sourceId: string?        // Entity ID (ULID reference, no FK)
  type: string             // Event type (e.g., "agent.started")
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
| `webhook` | GitHub webhook handlers (issues, PRs, pushes)            |
| `console` | Console server-side commands (triage, review, judge)     |
| `cli`     | CLI tools (reserved, not actively used)                  |
| `api`     | Direct API posts (reserved)                              |
| `cron`    | Scheduled tasks (reserved)                               |

## Event Types

### Agent Lifecycle

| Type              | Origin | Description                                 |
| ----------------- | ------ | ------------------------------------------- |
| `agent.started`   | action | Agent workflow begins                       |
| `agent.completed` | action | Workflow finishes, emits all collected data |

### GitHub Webhooks

| Type                           | Origin  | Description                                   |
| ------------------------------ | ------- | --------------------------------------------- |
| `github.issues.{action}`       | webhook | Issue opened, closed, reopened, labeled, etc. |
| `github.pull_request.{action}` | webhook | PR opened, closed, synchronize, etc.          |
| `github.push`                  | webhook | Push to a branch                              |

### Console Operations

| Type                           | Origin  | Description                                             |
| ------------------------------ | ------- | ------------------------------------------------------- |
| `github.issue.triaged`         | console | AI classification of an issue (type, scope, actionable) |
| `github.pull_request.reviewed` | console | AI review of a PR against a plan                        |
| `plan.evaluated`               | console | AI comparison of multiple implementations               |

### Infrastructure

| Type              | Origin | Description             |
| ----------------- | ------ | ----------------------- |
| `audit.started`   | action | Audit workflow begins   |
| `audit.completed` | action | Audit workflow finishes |

## Event Chains

Events form trees via `parentEventId`. A typical agent run chain:

```
agent.started
  └── agent.completed   (all collected data)
```

Parent inference works via tag matching — when `parentEventId` isn't explicit, `Event.inferParentEventId()` finds existing events with matching `gh:pr:`, `gh:issue:`, or `gh:workflow:` tags.

## Tags vs Data

Tags and data serve different purposes. Getting this wrong makes events hard to query or bloated.

### Tags: for filtering and grouping

Tags are **small, categorical, deterministic values** used for search and aggregation:

```
gh:repo:owner/name     # repository reference
gh:issue:42            # issue number
gh:pr:15               # pull request number
gh:branch:main         # branch name
gh:workflow:12345           # GitHub Actions run ID
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
  → Tag (e.g., harness:claude, model:gpt-4o, gh:issue:42)

Is it a measurement, long string, object, or array?
  → Data (e.g., cost_usd, finalMessage, checks)

Is it categorical AND you also need it in the payload for display?
  → Both tag AND data (e.g., model is a tag for filtering + in data for display)
```

## Data Convention

Event data uses an **open schema**. Any action can write any key. The `{type}.completed` event's data is assembled from `data.json` files in the results directory — the teardown recursively walks the directory tree and builds a nested object.

Common keys for `agent.completed`:

```ts
data: {
  workflow: {                     // computed by teardown
    durationMs: number,
    runUrl: string,
  },
  checks: {                       // from event/data key=checks/...
    tests: {
      unit: { outcome: "success" },
    },
    lint: {
      oxlint: { outcome: "success" },
    },
    typecheck: {
      tsc: { outcome: "success" },
    },
  },
  agent: {                        // from agent/claude, agent/opencode, etc.
    name: string,
    sessionId: string | null,
    finalMessage: string | null,
    metrics: {
      tokens: {
        input: number | null,
        output: number | null,
        reasoning: number | null,
        cache_read: number | null,
        cache_creation: number | null,
      },
      turns: number | null,
      cost_usd: number | null,
      model: string | null,
    } | null,
  },
  diff: {                         // from git/commit
    linesAdded: number,
    linesRemoved: number,
  },
  pr: {                           // from git/pr
    number: number,
    url: string,
  },
  branch: {                       // from git/branch
    name: string,
  },
}
```

These keys are conventions, not enforced schemas. Any action can write additional keys via `event/data`.

## Data Schemas by Event Type

### agent.started

```ts
data: {
  runUrl: string,          // GitHub Actions run URL
  // + any extra data passed via event/init data input
}
```

### agent.completed

Open schema — see Data Convention above.

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
