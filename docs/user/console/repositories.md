# Repositories

Repository pages are the main operating surface for day-to-day work.

## Repository Overview Card

Repository home page includes overview card with quick links and lightweight metrics:

- quick links: plans, agents, skills, health, issues, pull requests
- plan counts by status: draft, review, approved, implementing, completed, rejected
- agent run summary: recent run count, success rate, total cost, last activity

Links render immediately. Metrics load after page becomes interactive.

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
