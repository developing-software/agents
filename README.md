# Dev Agents

Platform-orchestrated AI development lifecycle for brownfield repositories. Plans are approved by humans, implemented by agents, and tracked through repository events, health checks, and reviews.

## Docs

### User Docs

- [Overview](./docs/user/overview.md)
- [Plans and Reviews](./docs/user/console/plans-and-reviews.md)
- [Repositories](./docs/user/console/repositories.md)
- [Events and Health](./docs/user/console/events-and-health.md)
- [GitHub Integration](./docs/user/integrations/github.md)
- [Forjero Integration](./docs/user/integrations/forjero.md)
- [CI Integration](./docs/user/integrations/ci.md)

### Dev Docs

- [Overview](./docs/dev/overview.md)
- [Setup](./docs/dev/setup.md)
- [System Architecture](./docs/dev/architecture/system.md)
- [Events and Tags](./docs/dev/architecture/events-and-tags.md)
- [Git Providers](./docs/dev/architecture/git-providers.md)
- [Actions and CI](./docs/dev/architecture/actions-and-ci.md)
- [Rebuilding on sandboxd](./docs/dev/architecture/sandboxd-rewrite.md)
- [Depending on sandboxd](./docs/dev/architecture/sandboxd-dependency.md)
- [Monorepo Layout](./docs/dev/repo/monorepo.md)
- [Testing and Generation](./docs/dev/repo/testing-and-generation.md)
- [Contributing](./docs/dev/contributing.md)

## Repository

- `packages/core` — shared domain logic and provider integration
- `packages/functions` — API and webhook ingestion
- `apps/console` — operator UI
- `actions/*` — workflow-side data collection and event emission

## Quick Start

```sh
bun install
bun run fmt
bun run lint
bun run typecheck
bun test
```
