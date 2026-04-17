# Repositories

Repository pages are the main operating surface for day-to-day work.

## What You Can View

- issues
- pull requests
- branches
- commits and trees
- actions and workflow activity
- agent configuration
- skills, prompts, audits, and plans
- event timelines and health views

## Repository Context

Most activity in the platform is scoped to a repository:

- plans are created against a repository
- events are emitted against a repository
- health checks are queried by repository and branch
- provider webhook events are normalized back to the repository record

## Provider Awareness

Repositories are provider-aware. The same `owner/repo` name can exist on different providers, so the platform treats provider plus full repository name as the stable identity at the tag level.
