<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getOverviewMetrics,
    type OverviewMetricsResult,
    type OverviewAgentMetrics,
  } from '$lib/features/agents/api/overview.remote';
  import type { PlanStatus } from '$lib/features/agents/plans/plan-helpers';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  const defaultPlanCounts: Record<PlanStatus, number> = {
    draft: 0,
    review: 0,
    approved: 0,
    implementing: 0,
    completed: 0,
    rejected: 0,
  };

  const defaultAgentMetrics: OverviewAgentMetrics = {
    recentRunCount: 0,
    successRate: null,
    totalCost: null,
    lastActivityAt: null,
  };

  let metrics = $state<OverviewMetricsResult>({
    planCounts: defaultPlanCounts,
    agentMetrics: defaultAgentMetrics,
  });
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function loadMetrics() {
    loading = true;
    error = null;
    try {
      metrics = await getOverviewMetrics({ organization, repoName });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load overview metrics';
      console.error('Failed to load overview metrics', err);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadMetrics();
  });

  function formatCost(cost: number | null): string {
    if (cost == null) return '\u2014';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cost);
  }

  function formatLastActivity(value: string | null): string {
    if (!value) return '\u2014';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '\u2014';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const statusRows: Array<Array<{ key: PlanStatus; label: string }>> = [
    [
      { key: 'draft', label: 'Draft' },
      { key: 'review', label: 'Review' },
      { key: 'approved', label: 'Approved' },
    ],
    [
      { key: 'implementing', label: 'Implementing' },
      { key: 'completed', label: 'Completed' },
      { key: 'rejected', label: 'Rejected' },
    ],
  ];
</script>

<section class="panel metrics-panel" aria-labelledby="overview-metrics-heading">
  <h3 id="overview-metrics-heading" class="overview-heading">Quick Metrics</h3>

  {#if loading}
    <div class="metrics-skeleton" role="status" aria-busy="true" aria-label="Loading metrics">
      <div class="skeleton-row">
        {#each [1, 2, 3] as i (i)}
          <div class="skeleton-item"></div>
        {/each}
      </div>
      <div class="skeleton-row">
        {#each [4, 5, 6] as i (i)}
          <div class="skeleton-item"></div>
        {/each}
      </div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <span class="sr-only">Loading metrics</span>
    </div>
  {:else}
    <div class="metrics-body" aria-busy="false">
      <div class="status-grid" role="table" aria-label="Plan status counts">
        {#each statusRows as row, rowIndex (`row-${rowIndex}`)}
          <div class="status-row" role="row">
            {#each row as status (status.key)}
              <p class="status-cell" role="cell">
                <span class="status-label">{status.label}</span>
                <span class="status-value">{metrics.planCounts[status.key] ?? 0}</span>
              </p>
            {/each}
          </div>
        {/each}
      </div>

      <dl class="agent-metrics">
        <div class="metric-row">
          <dt>Recent Runs (30d)</dt>
          <dd>{metrics.agentMetrics.recentRunCount ?? 0}</dd>
        </div>
        <div class="metric-row">
          <dt>Success Rate</dt>
          <dd>{metrics.agentMetrics.successRate == null ? '\u2014' : `${metrics.agentMetrics.successRate}%`}</dd>
        </div>
        <div class="metric-row">
          <dt>Total Cost (30d)</dt>
          <dd>{formatCost(metrics.agentMetrics.totalCost)}</dd>
        </div>
        <div class="metric-row">
          <dt>Last Activity</dt>
          <dd>{formatLastActivity(metrics.agentMetrics.lastActivityAt)}</dd>
        </div>
      </dl>

      {#if error}
        <p class="error-state">
          Unable to load latest metrics. Showing fallback values.
          <button type="button" class="retry-btn" onclick={loadMetrics}>Retry</button>
        </p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
  }

  .metrics-panel {
    min-width: 0;
  }

  .overview-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
  }

  .metrics-skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .skeleton-item {
    height: 36px;
    border-radius: 4px;
    background: var(--color-elevated);
    animation: pulse 1.3s ease-in-out infinite;
  }

  .skeleton-line {
    height: 16px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.3s ease-in-out infinite;
  }

  .metrics-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .status-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .status-cell {
    margin: 0;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    border-radius: 4px;
    padding: 7px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .status-label {
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    color: var(--color-text);
  }

  .agent-metrics {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 6px;
  }

  .metric-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .metric-row dt {
    font-size: 11px;
    color: var(--color-dim);
  }

  .metric-row dd {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
  }

  .error-state {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--color-dim);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .retry-btn {
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    border-radius: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    cursor: pointer;
  }

  .retry-btn:hover {
    border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
  }

  .sr-only {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.45;
    }
  }
</style>
