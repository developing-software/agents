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
  data: Record<string, unknown>  // Arbitrary payload
  timeCreated: string      // ISO timestamp
}
```

## Origins

| Origin | Description |
|--------|-------------|
| `action` | GitHub Actions workflows (agent runs, event/emit action) |
| `webhook` | GitHub webhook handlers (issues, PRs, pushes) |
| `console` | Console server-side commands (triage, review, judge) |
| `cli` | CLI tools (reserved, not actively used) |
| `api` | Direct API posts (reserved) |
| `cron` | Scheduled tasks (reserved) |

## Event Types

### Agent Lifecycle

| Type | Origin | Description |
|------|--------|-------------|
| `agent.started` | action | Agent workflow begins |
| `agent.result` | action | Harness finishes, emits metrics |
| `agent.completed` | action | Workflow finishes, emits checks + duration + diff stats |

### GitHub Webhooks

| Type | Origin | Description |
|------|--------|-------------|
| `github.issues.{action}` | webhook | Issue opened, closed, reopened, labeled, etc. |
| `github.pull_request.{action}` | webhook | PR opened, closed, synchronize, etc. |
| `github.push` | webhook | Push to a branch |

### Console Operations

| Type | Origin | Description |
|------|--------|-------------|
| `issue.triaged` | console | AI classification of an issue (type, scope, actionable) |
| `implementation.reviewed` | console | AI review of a PR against a plan |
| `plan.judged` | console | AI comparison of multiple implementations |

### Infrastructure

| Type | Origin | Description |
|------|--------|-------------|
| `audit.started` | action | Audit workflow begins |
| `audit.completed` | action | Audit workflow finishes |

## Event Chains

Events form trees via `parentEventId`. A typical agent run chain:

```
agent.started
  ├── agent.result      (harness metrics)
  └── agent.completed   (checks, duration, diff)
```

Parent inference works via tag matching — when `parentEventId` isn't explicit, `Event.inferParentEventId()` finds existing events with matching `gh:pr:`, `gh:issue:`, or `gh:run:` tags.

## Tags vs Data

Tags and data serve different purposes. Getting this wrong makes events hard to query or bloated.

### Tags: for filtering and grouping

Tags are **small, categorical, deterministic values** used for search and aggregation:

```
gh:repo:owner/name     # repository reference
gh:issue:42            # issue number
gh:pr:15               # pull request number
gh:branch:main         # branch name
gh:run:12345           # GitHub Actions run ID
env:production         # environment / base branch
harness:claude         # agent harness name
model:claude-sonnet-4-20250514  # LLM model identifier
plan:01JABCDEF         # plan ID
type:bug               # issue classification
scope:small            # issue scope
```

**Good tag values:** single word, short identifier, number, enum value.

### Data: for payload content

Data holds **everything that is NOT small and simple:**

- Strings longer than ~50 chars (`finalMessage`, `errorMessage`, `stackTrace`)
- Nested objects (`metrics`, `checks[]`)
- Arrays
- Numeric measurements (`durationMs`, `linesAdded`, `cost_usd`)
- URLs (`prUrl`, `runUrl`)

### Anti-patterns

| Anti-pattern | Why it's bad | Fix |
|---|---|---|
| Long string as a tag | Bloats tag index, not filterable | Move to `data` |
| Categorical value only in `data` | Can't filter/group by it | Also add as a tag |
| Numeric metric as a tag | Tags are strings, can't aggregate | Put in `data` |
| Redundant tag + data without purpose | Confusing, maintenance burden | Pick one or document why both |

### Decision guide

```
Is it a short identifier, enum, or number you'd filter/group by?
  → Tag (e.g., harness:claude, model:gpt-4o, gh:issue:42)

Is it a measurement, long string, object, or array?
  → Data (e.g., cost_usd, finalMessage, checks[])

Is it categorical AND you also need it in the payload for display?
  → Both tag AND data (e.g., model is a tag for filtering + in data for display)
```

## Data Schemas by Event Type

### agent.started

```ts
data: {
  agent: string | null,    // agent name
  harness: string | null,  // harness type
  model: string | null,    // model override
  branch: string,          // working branch
  runUrl: string,          // GitHub Actions run URL
}
```

### agent.result

```ts
data: {
  agent: string,
  model: string | null,
  finalMessage: string,     // agent's last output
  sessionId: string | null, // harness session ID
  metrics: {
    input_tokens: number | null,
    output_tokens: number | null,
    reasoning_tokens: number | null,
    cache_read_input_tokens: number | null,
    cache_creation_input_tokens: number | null,
    num_turns: number | null,
    cost_usd: number | null,
    model: string | null,
  }
}
```

### agent.completed

```ts
data: {
  agent: string | null,
  model: string | null,
  branch: string,
  issueNumber: number | null,
  pullRequestNumber: number | null,
  linesAdded: number,
  linesRemoved: number,
  durationMs: number,
  prUrl: string,
  runUrl: string,
  metrics: Record<string, unknown> | null,  // copied from agent.result
  checks: Array<{
    category: string,     // e.g., "tests", "lint"
    name: string,         // e.g., "unit", "oxlint"
    outcome: "success" | "failure"
  }>
}
```

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

### issue.triaged

```ts
data: {
  type: string,       // bug, feature, task, question
  scope: string,      // trivial, small, medium, large
  actionable: boolean,
  reasoning: string,
}
```
