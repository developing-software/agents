<script lang="ts">
  import { getEventSummary } from './events.remote';

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  const summaryPromise = $derived.by(() => {
    return getEventSummary({ organization, repoName });
  });

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = Math.round(s % 60);
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  }

  function getCost(metrics: { name: string; sum: number; count: number }[]): string {
    const cost = metrics.find((m) => m.name === 'cost_usd');
    return cost ? `$${cost.sum.toFixed(2)}` : '$0.00';
  }

  function getPassRate(checks: { category: string; name: string; passed: number; failed: number }[]): string {
    const totalPassed = checks.reduce((acc, c) => acc + c.passed, 0);
    const totalAll = checks.reduce((acc, c) => acc + c.passed + c.failed, 0);
    if (totalAll === 0) return '—';
    return `${((totalPassed / totalAll) * 100).toFixed(0)}%`;
  }

  function getPassPercent(checks: { passed: number; failed: number }[]): number {
    const totalPassed = checks.reduce((acc, c) => acc + c.passed, 0);
    const totalAll = checks.reduce((acc, c) => acc + c.passed + c.failed, 0);
    return totalAll > 0 ? (totalPassed / totalAll) * 100 : 0;
  }
</script>

{#await summaryPromise}
  <div class="overview">
    <div class="stat-row">
      {#each [1, 2, 3, 4] as i (i)}
        <div class="stat-card">
          <div class="skeleton-label"></div>
          <div class="skeleton-value"></div>
        </div>
      {/each}
    </div>
  </div>
{:then summary}
  {#if summary.total > 0}
    <div class="overview">
      <div class="stat-row">
        <div class="stat-card">
          <span class="stat-label">Runs</span>
          <span class="stat-value">{summary.total}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Avg Duration</span>
          <span class="stat-value">{formatDuration(summary.avgDurationMs)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Total Cost</span>
          <span class="stat-value">{getCost(summary.metrics)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Pass Rate</span>
          <span class="stat-value">{getPassRate(summary.checks)}</span>
          <div class="mini-bar-track">
            <div
              class="mini-bar-pass"
              style="width:{getPassPercent(summary.checks)}%;"
            ></div>
            <div
              class="mini-bar-fail"
              style="width:{100 - getPassPercent(summary.checks)}%;"
            ></div>
          </div>
        </div>
      </div>

      {#if summary.checks.length > 0}
        <div class="checks-breakdown">
          {#each summary.checks as check (`${check.category}/${check.name}`)}
            {@const total = check.passed + check.failed}
            {@const passPercent = total > 0 ? (check.passed / total) * 100 : 0}
            <div class="check-row">
              <span class="check-label">{check.category}/{check.name}</span>
              <span class="check-counts">{check.passed}/{total}</span>
              <div class="check-bar-track">
                <div
                  class="check-bar-pass"
                  style="width:{passPercent}%;"
                ></div>
                <div
                  class="check-bar-fail"
                  style="width:{100 - passPercent}%;"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      {#if summary.byAgent.length > 0}
        <div class="agents-breakdown">
          {#each summary.byAgent as [agent, count] (agent)}
            <span class="agent-pill">{agent} <span class="agent-count">{count}</span></span>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="empty-state">No runs recorded yet</div>
  {/if}
{:catch}
  <div></div>
{/await}

<style>
  .overview { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }

  .stat-row { display: flex; flex-wrap: wrap; gap: 6px; }

  .stat-card {
    flex: 1;
    min-width: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .stat-value {
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .mini-bar-track {
    display: flex;
    height: 3px;
    border-radius: 1.5px;
    overflow: hidden;
    margin-top: 4px;
  }

  .mini-bar-pass {
    height: 3px;
    background: var(--color-success, #22c55e);
    transition: width 0.2s ease;
  }

  .mini-bar-fail {
    height: 3px;
    background: var(--color-danger, #ef4444);
    transition: width 0.2s ease;
  }

  .checks-breakdown { display: flex; flex-direction: column; gap: 2px; }

  .check-row {
    display: grid;
    grid-template-columns: 1fr 48px 120px;
    align-items: center;
    gap: 8px;
    height: 22px;
  }

  .check-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check-counts {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .check-bar-track {
    display: flex;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
  }

  .check-bar-pass {
    height: 4px;
    background: var(--color-success, #22c55e);
    transition: width 0.2s ease;
  }

  .check-bar-fail {
    height: 4px;
    background: var(--color-danger, #ef4444);
    transition: width 0.2s ease;
  }

  .agents-breakdown { display: flex; flex-wrap: wrap; gap: 4px; }

  .agent-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    line-height: 1.6;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }

  .agent-count { opacity: 0.7; }

  .empty-state {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
    padding: 20px 0;
    text-align: center;
  }

  .skeleton-label {
    width: 48px;
    height: 10px;
    background: var(--color-elevated);
    border-radius: 2px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skeleton-value {
    width: 56px;
    height: 16px;
    background: var(--color-elevated);
    border-radius: 2px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
