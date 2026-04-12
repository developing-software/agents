<script lang="ts">
  import { getOverviewMetrics } from "./overview.remote";
  import { statusDotColor, PLAN_STATUSES } from "./plans/plan-helpers";

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  let metricsPromise = $state<ReturnType<typeof getOverviewMetrics> | null>(null);

  $effect(() => {
    metricsPromise = getOverviewMetrics({ organization, repoName });
  });

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const secs = Math.round(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  }

  function formatCost(usd: number): string {
    if (usd === 0) return "$0";
    if (usd < 0.01) return "<$0.01";
    return `$${usd.toFixed(2)}`;
  }

  function successRate(success: number, total: number): string {
    if (total === 0) return "\u2014";
    return `${Math.round((success / total) * 100)}%`;
  }
</script>

{#if metricsPromise}
  {#await metricsPromise}
    <!-- Skeleton state -->
    <div class="metrics-wrap" aria-busy="true" aria-label="Loading metrics">
      <div class="metrics-section">
        <span class="metrics-label">Plans</span>
        <div class="plan-row">
          {#each [1, 2, 3, 4, 5, 6] as i (i)}
            <div class="skel-chip"></div>
          {/each}
        </div>
      </div>
      <div class="metrics-section">
        <span class="metrics-label">Agents</span>
        <div class="agent-stats">
          {#each [1, 2, 3, 4] as i (i)}
            <div class="skel-stat"></div>
          {/each}
        </div>
      </div>
    </div>
  {:then metrics}
    <div class="metrics-wrap">
      <!-- Plan counts -->
      <div class="metrics-section">
        <span class="metrics-label">Plans</span>
        <div class="plan-row">
          {#each PLAN_STATUSES as status (status)}
            {@const count = metrics.planCounts[status] ?? 0}
            <span class="plan-chip" title="{status}: {count}">
              <span class="plan-dot" style="background: {statusDotColor(status)};"></span>
              <span class="plan-status">{status}</span>
              <span class="plan-count">{count}</span>
            </span>
          {/each}
        </div>
      </div>

      <!-- Agent metrics -->
      <div class="metrics-section">
        <span class="metrics-label">Agents</span>
        {#if metrics.agentMetrics && metrics.agentMetrics.total > 0}
          <div class="agent-stats">
            <div class="stat" title="Total agent runs">
              <span class="stat-value">{metrics.agentMetrics.total}</span>
              <span class="stat-key">runs</span>
            </div>
            <div class="stat" title="Success rate">
              <span class="stat-value">{successRate(metrics.agentMetrics.workflowSuccess, metrics.agentMetrics.total)}</span>
              <span class="stat-key">success</span>
            </div>
            <div class="stat" title="Average duration">
              <span class="stat-value">{formatDuration(metrics.agentMetrics.avgDurationMs)}</span>
              <span class="stat-key">avg time</span>
            </div>
            <div class="stat" title="Total cost">
              <span class="stat-value">{formatCost(metrics.agentMetrics.totalCost)}</span>
              <span class="stat-key">cost</span>
            </div>
          </div>
          <div class="agent-detail">
            <span class="detail-item" title="Lines added">+{metrics.agentMetrics.totalLinesAdded}</span>
            <span class="detail-sep">/</span>
            <span class="detail-item removed" title="Lines removed">-{metrics.agentMetrics.totalLinesRemoved}</span>
            <span class="detail-sep">&middot;</span>
            <span class="detail-item" title="Workflow outcomes">{metrics.agentMetrics.workflowSuccess} ok, {metrics.agentMetrics.workflowFailure} fail, {metrics.agentMetrics.workflowCancelled} cancel</span>
          </div>
        {:else}
          <span class="no-data">No agent runs yet</span>
        {/if}
      </div>
    </div>
  {:catch}
    <div class="metrics-wrap metrics-error">
      <span class="error-text">Unable to load metrics</span>
    </div>
  {/await}
{/if}

<style>
  .metrics-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .metrics-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metrics-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  /* ---- Plan chips ---- */
  .plan-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .plan-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    font-size: 10px;
    color: var(--color-muted);
  }

  .plan-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .plan-status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }

  .plan-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text);
  }

  /* ---- Agent stats ---- */
  .agent-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 4px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  .stat-key {
    font-size: 9px;
    color: var(--color-dim);
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .agent-detail {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex-wrap: wrap;
  }

  .detail-item {
    color: var(--color-muted);
  }

  .detail-item.removed {
    color: var(--color-danger);
  }

  .detail-sep {
    color: var(--color-dim);
    opacity: 0.5;
  }

  .no-data {
    font-size: 11px;
    color: var(--color-dim);
  }

  /* ---- Skeleton ---- */
  .skel-chip {
    width: 72px;
    height: 20px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skel-stat {
    height: 38px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ---- Error ---- */
  .metrics-error {
    padding: 4px 0;
  }

  .error-text {
    font-size: 11px;
    color: var(--color-dim);
  }
</style>
