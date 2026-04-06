<script lang="ts">
  import { formatDuration, formatCost, formatTokensCompact } from '../helpers';

  interface SummaryData {
    total: number;
    byAgent: [string, number][];
    totalCost: number;
    totalTokens: number;
    checks: { category: string; name: string; passed: number; failed: number }[];
    avgDurationMs: number;
    totalLinesAdded: number;
    totalLinesRemoved: number;
    workflowSuccess: number;
    workflowFailure: number;
    workflowCancelled: number;
  }

  let { summary }: { summary: SummaryData } = $props();

  function getPassRate(checks: { passed: number; failed: number }[]): string {
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
        <span class="stat-value">{formatCost(summary.totalCost)}</span>
      </div>
      {#if summary.totalTokens > 0}
        <div class="stat-card">
          <span class="stat-label">Total Tokens</span>
          <span class="stat-value">{formatTokensCompact(summary.totalTokens)}</span>
        </div>
      {/if}
      {#if summary.totalLinesAdded > 0 || summary.totalLinesRemoved > 0}
        <div class="stat-card">
          <span class="stat-label">Lines Changed</span>
          <span class="stat-value lines-changed">+{summary.totalLinesAdded} / -{summary.totalLinesRemoved}</span>
        </div>
      {/if}
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
      {#if summary.workflowSuccess + summary.workflowFailure + summary.workflowCancelled > 0}
        {@const wfTotal = summary.workflowSuccess + summary.workflowFailure + summary.workflowCancelled}
        {@const wfRate = Math.round((summary.workflowSuccess / wfTotal) * 100)}
        <div class="stat-card">
          <span class="stat-label">Workflow Success</span>
          <span class="stat-value">{wfRate}%</span>
          <div class="mini-bar-track">
            <div class="mini-bar-pass" style="width:{wfRate}%;"></div>
            <div class="mini-bar-fail" style="width:{100 - wfRate}%;"></div>
          </div>
        </div>
      {/if}
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

<style>
  .overview { display: flex; flex-direction: column; gap: 8px; }
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
  .lines-changed { font-size: 12px; }
  .empty-state {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
    padding: 20px 0;
    text-align: center;
  }
</style>
