# Git Providers

The repo supports multiple git providers through normalized interfaces in `packages/core/src/git/provider/*`.

## Design

- provider-specific clients stay isolated
- normalized repo/issue/PR/branch/action shapes are shared
- repository-level behavior is keyed by provider plus provider-specific identity
- tags use the shared `git:*` format even when event types remain provider-specific

## Current Providers

- GitHub
- Forjero

## Responsibilities

Provider implementations are responsible for:

- webhook verification and parsing
- normalized repo, issue, PR, branch, content, and actions operations
- provider-specific installation/auth behavior
- mapping webhook payloads into repository-scoped events
