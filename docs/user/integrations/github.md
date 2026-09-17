# GitHub Integration

GitHub is currently the most complete provider integration in the repo.

## User-Facing Capabilities

- repository installation and sync
- issue and pull request views
- provider webhooks for issues, PRs, and pushes
- CI events from GitHub Actions workflows (checks, deploys, builds)
- installation tokens so agent runs can clone, push, and open PRs

## What To Expect

- repository activity appears in the console as normalized events
- agent runs execute in sandboxd, not GitHub Actions — see [sandboxd](./sandboxd.md)
- PR review and fix loops are centered around GitHub PRs
