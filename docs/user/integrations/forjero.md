# Forjero Integration

Forjero support follows the same high-level repository, issue, PR, and push model as GitHub.

## User-Facing Capabilities

- repository installation and sync
- issue and pull request views
- normalized webhook events for issues, PRs, and pushes

## Expected Differences

- provider capabilities may differ from GitHub in small ways
- event types keep provider-specific names, while tags use the shared `git:*` format
- the console should present repository activity consistently even when webhook payloads differ
