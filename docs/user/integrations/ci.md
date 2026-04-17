# CI Integration

CI is integrated through reusable actions and event emission, not as a separate product surface.

## What CI Contributes

- branch and PR context
- structured check results
- agent run metadata
- artifacts
- deploy and teardown events

## User View

- checks appear in repository health
- CI-generated events appear in repository and plan timelines
- deploy and review status become part of the same event graph as agent runs

## Why This Matters

The platform uses the same event system for human actions, provider webhooks, and CI. That keeps repository state, health, and implementation history in one place.
