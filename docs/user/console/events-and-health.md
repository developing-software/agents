# Events And Health

Events and health views explain what happened in a repository and whether the current branch or plan is in a good state.

## Events

Events capture:

- provider webhooks
- agent runs
- reviews and plan evaluation
- deploys
- checks and CI activity

The console uses these events to show repository timelines, plan trees, and run details.

## Health

The health view is the repository-facing summary of checks for a branch. It answers questions like:

- did lint pass?
- did tests pass?
- did typecheck pass?
- when was the latest checks event recorded?

## Relationship To CI

CI runs emit structured events and check results. Health is not a separate system; it is a read model over emitted events.

## Relationship To Plans

Plan pages embed their related events so implementation, review, and follow-up work stay visible in one place.
