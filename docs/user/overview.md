# User Docs

Dev Agents is an AI development platform for brownfield repositories. Humans approve plans, dispatch agent runs, review results, and decide what gets merged.

## Core Flow

1. Issues are triaged and grouped into a plan.
2. A human approves the plan.
3. One or more agents are dispatched from the console.
4. Each agent works on its own branch and usually opens its own PR.
5. Reviews, fix runs, and winner selection happen in the console.
6. Events, health checks, and metrics stay attached to the repository and plan.

## Main Areas

- [Plans and Reviews](./console/plans-and-reviews.md)
- [Repositories](./console/repositories.md)
- [Events and Health](./console/events-and-health.md)
- [GitHub Integration](./integrations/github.md)
- [Forjero Integration](./integrations/forjero.md)
- [CI Integration](./integrations/ci.md)

## Concepts

- A plan is the approval boundary for implementation work.
- A repository is the main source object for issues, PRs, branches, events, and health views.
- Events are the timeline of what happened across agents, webhooks, reviews, deploys, and checks.
- Health is the repository-facing view of checks and CI outcomes.
