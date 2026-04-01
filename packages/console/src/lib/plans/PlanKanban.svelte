<script lang="ts">
  import {
    statusDotColor,
    authorBadgeStyle,
    relativeTime,
    PLAN_STATUSES,
  } from './plan-helpers';

  type PlanItem = {
    id: string;
    title: string;
    status: string;
    authorType: string;
    tags: string[];
    timeCreated: string;
  };

  let {
    organization,
    repoName,
    plans,
  }: {
    organization: string;
    repoName: string;
    plans: PlanItem[];
  } = $props();

  let grouped = $derived(
    PLAN_STATUSES.reduce(
      (acc, status) => {
        acc[status] = plans.filter((p) => p.status === status);
        return acc;
      },
      {} as Record<string, PlanItem[]>,
    ),
  );
</script>

<div class="kanban">
  {#each PLAN_STATUSES as status (status)}
    {@const items = grouped[status] ?? []}
    <div class="column">
      <div class="column-header">
        <span class="dot" style="background: {statusDotColor(status)}"></span>
        <span class="column-title">{status}</span>
        <span class="column-count">{items.length}</span>
      </div>
      <div class="column-body">
        {#each items as plan (plan.id)}
          <a
            href="/gh/{organization}/{repoName}/plans/{plan.id}"
            class="card"
          >
            <div class="card-title">{plan.title}</div>
            <div class="card-meta">
              <span class="card-badge" style={authorBadgeStyle(plan.authorType)}>{plan.authorType}</span>
              {#each plan.tags.slice(0, 2) as tag (tag)}
                <span class="card-tag">{tag}</span>
              {/each}
              <span class="card-time">{relativeTime(plan.timeCreated)}</span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .kanban {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .column {
    min-width: 200px;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    max-height: 600px;
  }

  .column-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .column-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    text-transform: capitalize;
  }

  .column-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    background: var(--color-surface);
    padding: 0 5px;
    border-radius: 3px;
    line-height: 1.6;
  }

  .column-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card {
    display: block;
    text-decoration: none;
    padding: 8px 10px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    transition: border-color 0.1s;
  }
  .card:hover {
    border-color: var(--color-border-bright);
  }

  .card-title {
    font-size: 12px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 6px;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .card-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 3px;
    line-height: 1.6;
  }

  .card-tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 3px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-dim);
    line-height: 1.6;
  }

  .card-time {
    font-size: 10px;
    color: var(--color-dim);
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }
</style>
