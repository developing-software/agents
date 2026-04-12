<script lang="ts">
  import { resource } from "runed";
  import { getOverviewMetrics } from "../../routes/gh/[organization]/[repo]/overview.remote";

  interface Props {
    organization: string;
    repoName: string;
  }

  let { organization, repoName }: Props = $props();

  const metrics = resource(
    () => ({ organization, repoName }),
    ({ organization, repoName }) => getOverviewMetrics({ organization, repoName }),
  );

  const PLAN_STATUSES = ['draft', 'review', 'approved', 'implementing', 'completed', 'rejected'] as const;

  function successRate(m: { total: number; workflowSuccess: number }): string {
    if (m.total === 0) return '—';
    return Math.round((m.workflowSuccess / m.total) * 100) + '%';
  }
</script>

{#if metrics.loading}
  <div class="metrics-grid" aria-busy="true" aria-label="Loading metrics">
    <div class="metric-group">
      <div class="metric-group-label skeleton-label"></div>
      <div class="status-row">
        {#each PLAN_STATUSES as _}
          <div class="status-item">
            <span class="skeleton-count"></span>
            <span class="skeleton-name"></span>
          </div>
        {/each}
      </div>
    </div>
    <div class="metric-group">
      <div class="metric-group-label skeleton-label"></div>
      <div class="agent-row">
        {#each [0, 1, 2] as _}
          <div class="agent-stat">
            <span class="skeleton-count"></span>
            <span class="skeleton-name"></span>
          </div>
        {/each}
      </div>
    </div>
  </div>
{:else if metrics.error}
  <div class="metrics-error" role="alert">
    <span>Unable to load metrics</span>
  </div>
{:else if !metrics.current}
  <div class="metrics-empty">No data available</div>
{:else}
  {@const m = metrics.current}
  <div class="metrics-grid">
    <!-- Plan status breakdown -->
    <div class="metric-group">
      <span class="metric-group-label">Plans</span>
      <div class="status-row">
        {#each PLAN_STATUSES as status}
          <div class="status-item" title="{status}: {m.planCounts[status] ?? 0}">
            <span class="status-count">{m.planCounts[status] ?? 0}</span>
            <span class="status-name status-{status}">{status}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Agent run metrics -->
    <div class="metric-group">
      <span class="metric-group-label">Agent Runs</span>
      <div class="agent-row">
        <div class="agent-stat" title="Total agent runs">
          <span class="agent-count">{m.agentMetrics.total}</span>
          <span class="agent-label">total</span>
        </div>
        <div class="agent-stat" title="Successful runs">
          <span class="agent-count agent-success">{m.agentMetrics.workflowSuccess}</span>
          <span class="agent-label">passed</span>
        </div>
        <div class="agent-stat" title="Failed runs">
          <span class="agent-count agent-failure">{m.agentMetrics.workflowFailure}</span>
          <span class="agent-label">failed</span>
        </div>
        <div class="agent-stat" title="Success rate">
          <span class="agent-count">{successRate(m.agentMetrics)}</span>
          <span class="agent-label">rate</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .metrics-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .metric-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-group-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  /* Plan status row */
  .status-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .status-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-width: 40px;
  }

  .status-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  .status-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-dim);
  }

  .status-draft { color: var(--color-muted); }
  .status-review { color: var(--color-warning, #e6a817); }
  .status-approved { color: var(--color-accent); }
  .status-implementing { color: var(--color-accent); }
  .status-completed { color: var(--color-success); }
  .status-rejected { color: var(--color-danger, #e05252); }

  /* Agent row */
  .agent-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .agent-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    min-width: 32px;
  }

  .agent-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;
  }

  .agent-success { color: var(--color-success); }
  .agent-failure { color: var(--color-danger, #e05252); }

  .agent-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-dim);
  }

  /* Skeleton loaders */
  .skeleton-label {
    width: 40px;
    height: 10px;
    background: var(--color-elevated);
    border-radius: 3px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skeleton-count {
    display: block;
    width: 20px;
    height: 15px;
    background: var(--color-elevated);
    border-radius: 3px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skeleton-name {
    display: block;
    width: 36px;
    height: 9px;
    background: var(--color-elevated);
    border-radius: 2px;
    animation: pulse 1.4s ease-in-out infinite;
    animation-delay: 0.15s;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  /* Error / empty states */
  .metrics-error,
  .metrics-empty {
    font-size: 11px;
    color: var(--color-dim);
    font-family: "JetBrains Mono", monospace;
    padding: 4px 0;
  }
</style>
