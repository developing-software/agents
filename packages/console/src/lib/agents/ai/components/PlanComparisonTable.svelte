<script lang="ts">
  import type { PlanRun, ReviewResult, CompareResult } from './plan-types';
  import { formatCost, formatDuration, capitalize } from '$lib/events/helpers';

  let {
    runs,
    reviews,
    judgment,
    agentColor,
  }: {
    runs: PlanRun[];
    reviews: Record<number, ReviewResult>;
    judgment: CompareResult | null;
    agentColor: (agent: string) => string;
  } = $props();

  // ── Inline helpers ───────────────────────────────────────────────────

  function formatLines(added: number | null, removed: number | null): string {
    return `+${added ?? 0} / -${removed ?? 0}`;
  }

  function checksText(checks: PlanRun['checks']): string {
    const passed = checks.filter(c => c.outcome === 'success').length;
    const failed = checks.length - passed;
    return failed > 0 ? `${passed} pass / ${failed} fail` : `${passed} pass`;
  }

  function avgScore(scores: ReviewResult['scores']): number {
    return (scores.adherence + scores.quality + scores.completeness) / 3;
  }

  // ── Derived data ─────────────────────────────────────────────────────

  const agentRuns = $derived(runs.filter(r => r.cost_usd != null || r.durationMs != null));

  const bestCostIdx = $derived.by(() => {
    let best = -1;
    let min = Infinity;
    for (let i = 0; i < runs.length; i++) {
      const c = runs[i].cost_usd;
      if (c != null && c < min) { min = c; best = i; }
    }
    return best;
  });

  const bestDurationIdx = $derived.by(() => {
    let best = -1;
    let min = Infinity;
    for (let i = 0; i < runs.length; i++) {
      const d = runs[i].durationMs;
      if (d != null && d < min) { min = d; best = i; }
    }
    return best;
  });

  const bestChecksIdx = $derived.by(() => {
    let best = -1;
    let maxPct = -1;
    for (let i = 0; i < runs.length; i++) {
      const checks = runs[i].checks;
      if (checks.length === 0) continue;
      const passed = checks.filter(c => c.outcome === 'success').length;
      const pct = passed / checks.length;
      if (pct > maxPct) { maxPct = pct; best = i; }
    }
    return best;
  });

  // ── Proportion bar data ──────────────────────────────────────────────

  const costAgents = $derived(
    runs.filter(r => r.cost_usd != null && r.cost_usd > 0)
  );

  const totalCost = $derived(
    costAgents.reduce((s, r) => s + (r.cost_usd ?? 0), 0)
  );

  const maxDuration = $derived(
    Math.max(...runs.map(r => r.durationMs ?? 0))
  );

  // ── Review score data ────────────────────────────────────────────────

  const reviewEntries = $derived(
    runs
      .filter(r => r.prNumber != null && reviews[r.prNumber!] != null)
      .map(r => ({
        agent: r.agent,
        color: agentColor(r.agent),
        score: avgScore(reviews[r.prNumber!].scores),
      }))
  );
</script>

<div class="comparison-table">
  <!-- ── 1. Metrics Table ──────────────────────────────────────────────── -->
  <table class="metrics">
    <thead>
      <tr>
        <th class="metric-label-cell"></th>
        {#each runs as run, i (run.id)}
          <th class="agent-header">
            <span class="agent-header-inner">
              <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
              <span class="agent-name">{capitalize(run.agent)}</span>
            </span>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      <!-- Cost -->
      <tr>
        <td class="metric-label">cost</td>
        {#each runs as run, i (run.id)}
          <td class="metric-value" class:best-value={i === bestCostIdx}>
            {run.cost_usd != null ? formatCost(run.cost_usd) : '--'}
          </td>
        {/each}
      </tr>
      <!-- Duration -->
      <tr>
        <td class="metric-label">duration</td>
        {#each runs as run, i (run.id)}
          <td class="metric-value" class:best-value={i === bestDurationIdx}>
            {run.durationMs != null ? formatDuration(run.durationMs) : '--'}
          </td>
        {/each}
      </tr>
      <!-- Lines -->
      <tr>
        <td class="metric-label">lines</td>
        {#each runs as run (run.id)}
          <td class="metric-value">{formatLines(run.linesAdded, run.linesRemoved)}</td>
        {/each}
      </tr>
      <!-- Turns -->
      <tr>
        <td class="metric-label">turns</td>
        {#each runs as run (run.id)}
          <td class="metric-value">{run.turns ?? '--'}</td>
        {/each}
      </tr>
      <!-- Checks -->
      <tr>
        <td class="metric-label">checks</td>
        {#each runs as run, i (run.id)}
          <td class="metric-value" class:best-value={i === bestChecksIdx}>
            {checksText(run.checks)}
          </td>
        {/each}
      </tr>
    </tbody>
  </table>

  <!-- ── 2. Proportion Bars ────────────────────────────────────────────── -->
  {#if costAgents.length >= 2}
    <div class="bars-section">
      <!-- Cost proportion bar -->
      <div class="section-label">cost proportion</div>
      <div class="cost-bar">
        {#each costAgents as run (run.id)}
          {@const pct = totalCost > 0 ? ((run.cost_usd ?? 0) / totalCost) * 100 : 0}
          <div
            class="cost-segment"
            style="width:{pct}%;background:{agentColor(run.agent)};"
          ></div>
        {/each}
      </div>
      <div class="cost-legend">
        {#each costAgents as run (run.id)}
          {@const pct = totalCost > 0 ? ((run.cost_usd ?? 0) / totalCost) * 100 : 0}
          <span class="legend-item">
            <span class="legend-dot" style="background:{agentColor(run.agent)};"></span>
            {capitalize(run.agent)} {Math.round(pct)}%
          </span>
        {/each}
      </div>
    </div>
  {/if}

  {#if agentRuns.length >= 2 && maxDuration > 0}
    <div class="bars-section">
      <!-- Duration bars -->
      <div class="section-label">duration</div>
      <div class="duration-bars">
        {#each runs as run (run.id)}
          {@const pct = maxDuration > 0 ? ((run.durationMs ?? 0) / maxDuration) * 100 : 0}
          <div class="duration-row">
            <span class="duration-agent">{capitalize(run.agent)}</span>
            <div class="duration-track">
              <div
                class="duration-fill"
                style="width:{pct}%;background:{agentColor(run.agent)};"
              ></div>
            </div>
            <span class="duration-value">
              {run.durationMs != null ? formatDuration(run.durationMs) : '--'}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── 3. Score Bars ─────────────────────────────────────────────────── -->
  {#if reviewEntries.length > 0}
    <div class="bars-section">
      <div class="section-label">avg review score</div>
      <div class="score-bars">
        {#each reviewEntries as entry (entry.agent)}
          {@const pct = (entry.score / 10) * 100}
          <div class="score-row">
            <span class="score-agent">
              <span class="agent-dot" style="background:{entry.color};"></span>
              {capitalize(entry.agent)}
            </span>
            <div class="score-track">
              <div
                class="score-fill"
                style="width:{pct}%;background:{entry.color};"
              ></div>
            </div>
            <span class="score-value">{entry.score.toFixed(1)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ── Container ────────────────────────────────────────────────────── */

  .comparison-table {
    font-family: "JetBrains Mono", monospace;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Metrics Table ────────────────────────────────────────────────── */

  .metrics {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
  }

  .metrics th,
  .metrics td {
    padding: 4px 10px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  .metric-label-cell {
    width: 64px;
  }

  .agent-header {
    font-weight: normal;
  }

  .agent-header-inner {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .agent-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  .agent-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .metric-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .metric-value {
    font-size: 12px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .best-value {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
  }

  /* ── Bars sections ────────────────────────────────────────────────── */

  .bars-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  /* ── Cost bar ─────────────────────────────────────────────────────── */

  .cost-bar {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
  }

  .cost-segment {
    height: 100%;
    transition: width 0.3s ease;
  }

  .cost-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--color-muted);
  }

  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Duration bars ────────────────────────────────────────────────── */

  .duration-bars {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .duration-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .duration-agent {
    font-size: 11px;
    color: var(--color-muted);
    width: 64px;
    flex-shrink: 0;
  }

  .duration-track {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    overflow: hidden;
  }

  .duration-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .duration-value {
    font-size: 11px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    width: 56px;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Score bars ───────────────────────────────────────────────────── */

  .score-bars {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .score-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .score-agent {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--color-muted);
    width: 96px;
    flex-shrink: 0;
  }

  .score-track {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .score-value {
    font-size: 11px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    width: 32px;
    text-align: right;
    flex-shrink: 0;
  }
</style>
