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
    body: string;
    status: string;
    authorType: string;
    tags: string[];
    data: Record<string, unknown>;
    source: string | null;
    sourceId: string | null;
    createdBy: string | null;
    timeCreated: string;
    timeUpdated: string;
  };

  let {
    organization,
    repoName,
    plans,
    emptyText = 'No plans',
  }: {
    organization: string;
    repoName: string;
    plans: PlanItem[];
    emptyText?: string;
  } = $props();

  let activeFilter = $state<'all' | string>('all');

  let filtered = $derived(
    activeFilter === 'all'
      ? plans
      : plans.filter((p) => p.status === activeFilter),
  );
</script>

<div class="filter-tabs">
  <button
    type="button"
    class="tab"
    class:tab-active={activeFilter === 'all'}
    onclick={() => { activeFilter = 'all'; }}
  >all</button>
  {#each PLAN_STATUSES as status (status)}
    <button
      type="button"
      class="tab"
      class:tab-active={activeFilter === status}
      onclick={() => { activeFilter = status; }}
    >{status}</button>
  {/each}
</div>

{#if filtered.length === 0}
  <div class="empty">{emptyText}</div>
{:else}
  <div class="list-container">
    {#each filtered as plan, i (plan.id)}
      <div class="plan-row" class:plan-row-border={i > 0}>
        <span class="dot" style="background: {statusDotColor(plan.status)}"></span>

        <span class="title">{plan.title}</span>

        <span class="author-badge" style={authorBadgeStyle(plan.authorType)}>{plan.authorType}</span>

        {#each plan.tags.slice(0, 3) as tag (tag)}
          <span class="tag-pill">{tag}</span>
        {/each}

        <span class="status-text" style="color: {statusDotColor(plan.status)}">{plan.status}</span>

        <span class="time">{relativeTime(plan.timeCreated)}</span>

        <a href="/gh/{organization}/{repoName}/plans/{plan.id}" class="detail-link">&rarr;</a>
      </div>
    {/each}
  </div>
{/if}

<style>
  .filter-tabs { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active { background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); border-color: color-mix(in srgb, var(--color-accent) 35%, transparent); }
  .tab-active:hover { color: var(--color-accent); }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
    font-size: 12px;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .list-container {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 4px;
    overflow: hidden;
  }

  .plan-row {
    display: flex;
    gap: 12px;
    padding: 6px 12px;
    min-height: 36px;
    align-items: center;
  }

  .plan-row-border {
    border-top: 1px solid var(--color-border);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: var(--color-text);
  }

  .author-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 0 5px;
    border-radius: 3px;
    line-height: 1.6;
    flex-shrink: 0;
  }

  .tag-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 0 5px;
    line-height: 17px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    border-radius: 3px;
  }

  .status-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    width: 80px;
    text-align: right;
    flex-shrink: 0;
  }

  .time {
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    width: 50px;
    text-align: right;
  }

  .detail-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-decoration: none;
    flex-shrink: 0;
  }
  .detail-link:hover {
    color: var(--color-accent);
  }
</style>
