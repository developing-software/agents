<script lang="ts">
  import { onMount } from "svelte";
  import { getOverviewMetrics, type OverviewMetricsResult } from "../api/overview.remote";

  let { organization, repoName }: { organization: string; repoName: string } = $props();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let _query = $state<any>(null);
  let metricsError = $state(false);

  const metrics = $derived<OverviewMetricsResult | undefined>(_query?.current);
  const loading = $derived(!metricsError && metrics == null);

  onMount(() => {
    try {
      _query = getOverviewMetrics({ organization, repoName });
    } catch (e) {
      console.error("Failed to load overview metrics", e);
      metricsError = true;
    }
  });

  const PLAN_ROW1 = ["draft", "review", "approved"] as const;
  const PLAN_ROW2 = ["implementing", "completed", "rejected"] as const;

  function fmtCost(n: number | null | undefined): string {
    if (n == null) return "—";
    return `$${n.toFixed(2)}`;
  }

  function fmtRate(n: number | null | undefined): string {
    if (n == null) return "—";
    return `${n}%`;
  }
</script>

<div class="metrics-root" role="status" aria-busy={loading} aria-label="Repository metrics">
  {#if metricsError}
    <p class="error-text">Unable to load metrics</p>
  {:else if loading}
    <div class="skeleton-group">
      <div class="skeleton-row">
        {#each [1, 2, 3] as i (i)}
          <div class="skeleton-cell"></div>
        {/each}
      </div>
      <div class="skeleton-row">
        {#each [1, 2, 3] as i (i)}
          <div class="skeleton-cell"></div>
        {/each}
      </div>
      <div class="skeleton-agent">
        {#each [1, 2, 3] as i (i)}
          <div class="skeleton-stat"></div>
        {/each}
      </div>
    </div>
  {:else if metrics}
    <div class="plan-counts">
      <h3 class="subsection-label">Plans</h3>
      <div class="count-grid">
        {#each PLAN_ROW1 as status (status)}
          <div class="count-cell">
            <span class="count-value">{metrics.planCounts[status]}</span>
            <span class="count-label">{status}</span>
          </div>
        {/each}
        {#each PLAN_ROW2 as status (status)}
          <div class="count-cell">
            <span class="count-value">{metrics.planCounts[status]}</span>
            <span class="count-label">{status}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="agent-stats">
      <h3 class="subsection-label">Agents</h3>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-value">{metrics.agentMetrics.recentRunCount}</span>
          <span class="stat-label">runs</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{fmtRate(metrics.agentMetrics.successRate)}</span>
          <span class="stat-label">passing</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{fmtCost(metrics.agentMetrics.totalCost)}</span>
          <span class="stat-label">cost</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .metrics-root {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 80px;
  }

  .subsection-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
    margin: 0 0 6px;
  }

  .count-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .count-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    background: var(--color-elevated);
    border-radius: 4px;
    gap: 2px;
  }

  .count-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  .count-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    text-transform: capitalize;
  }

  .stat-row {
    display: flex;
    gap: 4px;
  }

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 4px;
    background: var(--color-elevated);
    border-radius: 4px;
    gap: 2px;
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  .stat-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
  }

  .error-text {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
  }

  /* Skeleton loaders */

  .skeleton-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .skeleton-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .skeleton-cell {
    height: 44px;
    background: var(--color-elevated);
    border-radius: 4px;
    animation: sk-pulse 1.4s ease-in-out infinite;
  }

  .skeleton-agent {
    display: flex;
    gap: 4px;
  }

  .skeleton-stat {
    flex: 1;
    height: 40px;
    background: var(--color-elevated);
    border-radius: 4px;
    animation: sk-pulse 1.4s ease-in-out infinite;
  }

  .skeleton-stat:nth-child(2) {
    animation-delay: 0.2s;
  }

  .skeleton-stat:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes sk-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
