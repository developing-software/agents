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
    ondispatch,
  }: {
    organization: string;
    repoName: string;
    plans: PlanItem[];
    emptyText?: string;
    ondispatch?: (plan: PlanItem, agent: string) => Promise<void>;
  } = $props();

  let activeFilter = $state<'all' | string>('all');
  let dispatchingId = $state<string | null>(null);
  let dispatched = $state<Set<string>>(new Set());

  async function handleDispatch(plan: PlanItem, agent: string) {
    try {
      await ondispatch!(plan, agent);
      dispatched = new Set([...dispatched, plan.id]);
    } finally {
      dispatchingId = null;
    }
  }

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

        <TagList tags={plan.tags} limit={3} />

        <span class="status-text" style="color: {statusDotColor(plan.status)}">{plan.status}</span>

        <span class="time">{relativeTime(plan.timeCreated)}</span>

        <a href="/gh/{organization}/{repoName}/plans/{plan.id}" class="detail-link">&rarr;</a>

        {#if plan.status === 'approved' && ondispatch}
          {#if dispatched.has(plan.id)}
            <span class="dispatched-badge">dispatched</span>
          {:else if dispatchingId === plan.id}
            <div class="agent-picker">
              {#each ['claude', 'opencode', 'codex'] as agent (agent)}
                <button type="button" class="agent-btn" onclick={() => handleDispatch(plan, agent)}>{agent}</button>
              {/each}
              <button type="button" class="agent-btn agent-cancel" onclick={() => { dispatchingId = null; }}>&times;</button>
            </div>
          {:else}
            <button type="button" class="dispatch-btn" onclick={() => { dispatchingId = plan.id; }}>dispatch</button>
          {/if}
        {/if}
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

  .dispatch-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.1s;
  }
  .dispatch-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .agent-picker {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .agent-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .agent-btn:hover {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .agent-cancel {
    color: var(--color-dim);
  }
  .agent-cancel:hover {
    background: var(--color-danger);
    border-color: var(--color-danger);
  }

  .dispatched-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
    flex-shrink: 0;
  }
</style>
