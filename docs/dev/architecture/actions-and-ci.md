# Actions And CI

Reusable actions provide the workflow-side data collection and event emission model.

## Core Pattern

`actions/event/init` creates a lifecycle context:

- results directory
- tags directory
- event id
- API/token environment

Workflow steps then write:

- `data.json` files into the results tree
- flat tag files into the tags tree

Teardown reads both and emits the completed event.

## Important Actions

- `actions/event/init`
- `actions/event/emit`
- `actions/event/data`
- `actions/event/tag`
- `actions/git/branch`
- `actions/git/commit`
- `actions/git/pr`

## CI And Health

Checks emitted by workflows feed directly into:

- repository event timelines
- branch-level health views
- plan-linked implementation trees

Health is therefore an event consumer, not a parallel reporting system.

## Context Tags

Workflow-side git context is written as:

- `git-provider`
- `git-repo`
- `git-workflow`
- `git-branch`
- `git-pr`
