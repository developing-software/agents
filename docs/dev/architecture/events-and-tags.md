# Events And Tags

Events are the backbone of observability in this system. Every meaningful action — agent runs, git-provider webhooks, console operations, and CI workflows — emits an event into the same schema.

## Event Flow

```text
git provider event / console action / workflow step
                    |
                    v
              Event.create(...)
                    |
                    v
      tags: git:* + plan:* + type:* + scope:* ...
                    |
                    v
   parent inference only within same source + sourceId
```

## Event Shape

```ts
{
  id: string
  parentEventId: string | null
  source: string | null
  sourceId: string | null
  type: string
  origin: "action" | "webhook" | "console" | "cli" | "api" | "cron"
  tags: string[]
  data: Record<string, unknown>
  timeCreated: string
}
```

## Tag Model

Git-related tags are provider-aware and are built through `Tags.Git.*` in `packages/core/src/events/tag/index.ts`.

Examples:

```txt
git:provider:github
git:repo:github:owner/repo
git:issue:42
git:pr:15
git:branch:main
git:workflow:12345
```

## Tag API

Use the parser-first helpers instead of raw prefix checks:

- `Tags.Git.parse(tag)`
- `Tags.Git.list(tags)`
- `Tags.Git.find(tags, kind)`
- `Tags.Git.collect(tags, kind)`

Use `collect` when multiple values are valid, such as a plan linked to multiple issues.

## Parent Inference

`Event.inferParentEventId()` can infer parent links from git tags, but only within the same:

- `source`
- `sourceId`

This prevents unrelated repositories from linking together just because they share the same issue number or PR number.

## Event Families

- provider webhooks such as `github.*` and `forjero.*`
- agent lifecycle events
- checks events
- deploy events
- plan and review events

## Tags vs Data

Use tags for short, filterable identifiers. Use `data` for structured payloads, metrics, long strings, objects, and arrays.
