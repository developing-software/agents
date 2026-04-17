# Plans And Reviews

Plans are the unit of approved work. Nothing should be dispatched to an implementation agent until a human has reviewed and approved the plan.

## Plan Lifecycle

- `draft`
- `review`
- `approved`
- `implementing`
- `completed`
- `rejected`

## Typical Workflow

1. Create or refine a plan.
2. Link relevant issues.
3. Approve the plan.
4. Dispatch one or more agents.
5. Review each resulting PR.
6. Dispatch fixes on the same branch when needed.
7. Select a winner and merge.

## Review Loop

- Each PR can be reviewed by a human, an LLM judge, or both.
- Fix dispatches keep the branch alive and append review feedback to the next run.
- The plan stays the shared context across competing implementations.

## In Console

- Plan detail pages show implementations and related events.
- Reviews and fix runs stay grouped under the same plan.
- Winner selection is a human-controlled step.
