<script lang="ts">
  import { onMount } from "svelte";
  import { getOverviewMetrics } from "./overview.remote";
  import {
    PLAN_STATUSES,
    statusDotColor,
    type PlanStatus,
  } from "./plans/plan-helpers";
  import type { AgentMetrics } from "@agents/core/events/agent-metrics";

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  let loading = $state(true);
  let error = $state(false);
  let planCounts = $state<Record<PlanStatus, number> | null>(null);
  let agentSummary = $state<AgentMetrics.SummaryResult | null>(null);

  const totalPlans = $derived(
    planCounts ? Object.values(planCounts).reduce((a, b) => a + b, 0) : 0,
  );

  onMount(async () => {
    try {
      const result = await getOverviewMetrics({ organization, repoName });
      planCounts = result.planCounts as Record<PlanStatus, number>;
      agentSummary = result.agentSummary;
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  });

  function fmtDuration(ms: number): string {
    if (ms <= 0) return "\u2014";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  }

  function fmtCost(usd: number): string {
    if (usd <= 0) return "\u2014";
    return `$${usd.toFixed(2)}`;
  }
</script>

<div class="metrics-root">
  <!-- Plan Status Breakdown -->
  <div class="metric-group">
    <h3 class="metric-heading">Plans</h3>
    {#if loading}
      <div class="skeleton-row" aria-busy="true" aria-label="Loading plan metrics">
        {#each { length: 6 } as _}
          <div class="skeleton-chip"></div>
        {/each}
      </div>
    {:else if error}
      <p class="error-text">Unable to load</p>
    {:else}
      <div class="plan-chips">
        {#each PLAN_STATUSES as status (status)}
          {@const count = planCounts?.[status] ?? 0}
          <div
            class="plan-chip"
            class:plan-chip-zero={count === 0}
            title="{status}: {count}"
          >
            <span
              class="chip-dot"
              style="background: {statusDotColor(status)};"
            ></span>
            <span class="chip-count">{count}</span>
            <span class="chip-label">{status}</span>
          </div>
        {/each}
      </div>
      {#if totalPlans > 0}
        <p class="metric-total">{totalPlans} total</p>
      {/if}
    {/if}
  </div>

  <!-- Agent Summary -->
  <div class="metric-group">
    <h3 class="metric-heading">Agent Runs</h3>
    {#if loading}
      <div class="skeleton-row" aria-busy="true" aria-label="Loading agent metrics">
        {#each { length: 3 } as _}
          <div class="skeleton-stat"></div>
        {/each}
      </div>
    {:else if error}
      <p class="error-text">Unable to load</p>
    {:else if agentSummary && agentSummary.total > 0}
      <div class="agent-stats">
        <div class="stat-item">
          <span class="stat-value">{agentSummary.total}</span>
          <span class="stat-label">runs</span>
        </div>
        <div class="stat-item">
          <span class="stat-value stat-success">{agentSummary.workflowSuccess}</span>
          <span class="stat-label">passed</span>
        </div>
        <div class="stat-item">
          <span class="stat-value stat-failure">{agentSummary.workflowFailure}</span>
          <span class="stat-label">failed</span>
        </div>
        {#if agentSummary.avgDurationMs > 0}
          <div class="stat-item">
            <span class="stat-value">{fmtDuration(agentSummary.avgDurationMs)}</span>
            <span class="stat-label">avg</span>
          </div>
        {/if}
        {#if agentSummary.totalCost > 0}
          <div class="stat-item">
            <span class="stat-value">{fmtCost(agentSummary.totalCost)}</span>
            <span class="stat-label">cost</span>
          </div>
        {/if}
      </div>
      {#if agentSummary.byAgent.length > 0}
        <div class="agent-breakdown">
          {#each agentSummary.byAgent as [name, count] (name)}
            <span class="agent-tag">{name} <span class="agent-tag-count">{count}</span></span>
          {/each}
        </div>
      {/if}
    {:else}
      <p class="empty-metric">No agent runs recorded yet.</p>
    {/if}
  </div>
</div>

<style>
  .metrics-root {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .metric-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .metric-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
    margin: 0;
  }

  /* Plan chips */
  .plan-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .plan-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 7px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    font-size: 11px;
  }

  .plan-chip-zero {
    opacity: 0.45;
  }

  .chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .chip-count {
    font-family: "JetBrains Mono", monospace;
    font-weight: 600;
    font-size: 11px;
    color: var(--color-text);
  }

  .chip-label {
    font-size: 10px;
    color: var(--color-muted);
    text-transform: capitalize;
  }

  .metric-total {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    margin: 2px 0 0;
  }

  /* Agent stats */
  .agent-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .stat-item {
    display: flex;
    align-items: baseline;
    gap: 3px;
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }

  .stat-success {
    color: var(--color-success);
  }

  .stat-failure {
    color: var(--color-danger);
  }

  .stat-label {
    font-size: 10px;
    color: var(--color-dim);
  }

  .agent-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
  }

  .agent-tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .agent-tag-count {
    font-weight: 600;
    color: var(--color-text);
  }

  /* Skeleton loaders */
  .skeleton-row {
    display: flex;
    gap: 4px;
  }

  .skeleton-chip {
    width: 72px;
    height: 24px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.2s ease-in-out infinite;
  }

  .skeleton-stat {
    width: 52px;
    height: 20px;
    border-radius: 3px;
    background: var(--color-elevated);
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .error-text {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
  }

  .empty-metric {
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
  }
</style>
