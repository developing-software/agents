<script lang="ts">
  import {
    statusDotColor,
    authorBadgeStyle,
    relativeTime,
    PLAN_STATUSES,
  } from './plan-helpers';
  import TagList from '$lib/tag/TagList.svelte';

  type PlanItem = {
    id: string;
    title: string;
    body: string;
    status: string;
    authorType: string;
    tags: string[];
    timeCreated: string;
  };

  let {
    organization,
    repoName,
    plans,
    ondispatch,
    dispatched = $bindable(new Set<string>()),
  }: {
    organization: string;
    repoName: string;
    plans: PlanItem[];
    ondispatch?: (plan: PlanItem) => void;
    dispatched?: Set<string>;
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
              <TagList tags={plan.tags} limit={2} />
              <span class="card-time">{relativeTime(plan.timeCreated)}</span>
            </div>
            {#if plan.status === 'approved' && ondispatch}
              <div class="card-actions">
                {#if dispatched.has(plan.id)}
                  <span class="dispatched-badge">dispatched</span>
                {:else}
                  <button type="button" class="dispatch-btn" onclick={(e) => { e.preventDefault(); ondispatch!(plan); }}>dispatch</button>
                {/if}
              </div>
            {/if}
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

  .card-time {
    font-size: 10px;
    color: var(--color-dim);
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }

  .card-actions {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--color-border);
  }

  .dispatch-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    width: 100%;
    transition: background 0.1s;
  }
  .dispatch-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .dispatched-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
    display: block;
    text-align: center;
  }
</style>
