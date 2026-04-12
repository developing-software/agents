<script lang="ts">
  import { resource } from "runed";
  import { getOverviewMetrics } from "./overview.remote";

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  const metrics = resource(
    () => ({ organization, repoName }),
    ({ organization, repoName }) => getOverviewMetrics({ organization, repoName }),
  );

  const PLAN_STATUSES = [
    "draft",
    "review",
    "approved",
    "implementing",
    "completed",
    "rejected",
  ] as const;

  const STATUS_COLORS: Record<string, string> = {
    draft: "var(--color-dim)",
    review: "var(--color-warning)",
    approved: "var(--color-accent)",
    implementing: "var(--color-accent)",
    completed: "var(--color-success)",
    rejected: "var(--color-danger)",
  };
</script>

<div class="metrics-root">
  <!-- Plans breakdown -->
  <div class="metric-block">
    <span class="metric-label">Plans</span>
    {#if metrics.loading}
      <div class="skeleton-row" aria-label="Loading plan counts" role="status">
        {#each PLAN_STATUSES as _ (_)}
          <span class="skeleton-chip"></span>
        {/each}
      </div>
    {:else if metrics.error || !metrics.current}
      <span class="metric-error">—</span>
    {:else}
      <div class="status-row">
        {#each PLAN_STATUSES as status (status)}
          <span class="status-chip" style="--dot: {STATUS_COLORS[status]}">
            <span class="chip-dot" aria-hidden="true"></span>
            <span class="chip-count">{metrics.current.planCounts[status]}</span>
            <span class="chip-label">{status}</span>
          </span>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Agent summary -->
  <div class="metric-block">
    <span class="metric-label">Agents</span>
    {#if metrics.loading}
      <div class="skeleton-row" aria-label="Loading agent metrics" role="status">
        <span class="skeleton-stat"></span>
        <span class="skeleton-stat"></span>
        <span class="skeleton-stat"></span>
      </div>
    {:else if metrics.error || !metrics.current?.agentSummary}
      <span class="metric-error">—</span>
    {:else}
      {@const s = metrics.current.agentSummary}
      {@const successRate = s.total > 0 ? Math.round((s.workflowSuccess / s.total) * 100) : null}
      <div class="agent-stats">
        <span class="stat-item">
          <span class="stat-value">{s.total}</span>
          <span class="stat-desc">runs</span>
        </span>
        {#if successRate !== null}
          <span class="stat-sep">/</span>
          <span class="stat-item">
            <span class="stat-value" style="color: {successRate >= 80 ? 'var(--color-success)' : successRate >= 50 ? 'var(--color-warning)' : 'var(--color-danger)'}">{successRate}%</span>
            <span class="stat-desc">success</span>
          </span>
        {/if}
        {#if s.totalCost > 0}
          <span class="stat-sep">/</span>
          <span class="stat-item">
            <span class="stat-value">${s.totalCost.toFixed(2)}</span>
            <span class="stat-desc">cost</span>
          </span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .metrics-root {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .metric-block {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .metric-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  .metric-error {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  /* Plan status chips */
  .status-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    white-space: nowrap;
  }

  .chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--dot);
    flex-shrink: 0;
  }

  .chip-count {
    color: var(--color-text);
    font-weight: 600;
  }

  .chip-label {
    color: var(--color-dim);
  }

  /* Agent stats */
  .agent-stats {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }

  .stat-item {
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }

  .stat-desc {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .stat-sep {
    font-size: 10px;
    color: var(--color-border);
  }

  /* Skeletons */
  .skeleton-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .skeleton-chip {
    width: 64px;
    height: 20px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skeleton-stat {
    width: 48px;
    height: 20px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
</style>
