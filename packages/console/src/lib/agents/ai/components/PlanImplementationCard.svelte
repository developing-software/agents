<script lang="ts">
  import PRDiffLoader from '$lib/github/PRDiffLoader.svelte';
  import type { PlanRun, ReviewResult, CompareResult } from './plan-types';

  let {
    run,
    review,
    judgment,
    organization,
    repoName,
    completed,
    prStatesPromise,
    reviewLoading,
    onReview,
    onRefine,
    agentColor,
  }: {
    run: PlanRun;
    review: ReviewResult | undefined;
    judgment: CompareResult | null;
    organization: string;
    repoName: string;
    completed: boolean;
    prStatesPromise: Promise<Record<number, string | null>>;
    reviewLoading: boolean;
    onReview: () => void;
    onRefine?: (runId: string, suggestions: string[]) => void;
    agentColor: (agent: string) => string;
  } = $props();

  const prStatePromise = $derived.by(() => {
    if (run.prNumber == null) return Promise.resolve(null);
    return prStatesPromise.then((states) => states[run.prNumber!] ?? null);
  });

  let activeTab = $state<'overview' | 'diff' | 'judge'>('overview');

  const rankEntry = $derived(judgment?.rankings.find(r => r.prNumber === run.prNumber));
  const isWinner = $derived(judgment != null && run.prNumber != null && judgment.winner.prNumber === run.prNumber);
  const cc = $derived.by(() => {
    let passed = 0;
    let failed = 0;
    for (const c of run.checks) {
      if (c.outcome === 'success') passed++;
      else failed++;
    }
    return { passed, failed };
  });

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatCost(v: number | null): string {
    if (v == null) return '--';
    return `$${v.toFixed(2)}`;
  }

  function formatDuration(ms: number | null): string {
    if (ms == null) return '--';
    if (ms < 1000) return `${ms}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(1)}s`;
    const mins = Math.floor(secs / 60);
    const remSecs = Math.round(secs % 60);
    return `${mins}m ${remSecs}s`;
  }
</script>

<div class="agent-card" class:winner-card={isWinner}>
  <!-- Header: agent name + model + score + rank -->
  <div class="card-header">
    <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
    <span class="agent-name">{capitalize(run.agent)}</span>
    {#if run.model}
      <span class="model-tag">{run.model}</span>
    {/if}
    {#if review}
      <span class="score-badge">{((review.scores.adherence + review.scores.quality + review.scores.completeness) / 3).toFixed(1)}/10</span>
    {/if}
    {#if rankEntry}
      <span class="rank-badge">#{rankEntry.rank}</span>
    {/if}
  </div>

  <!-- PR row -->
  {#if run.prNumber != null}
    <div class="pr-row">
      {#if run.prUrl}
        <a href={run.prUrl} target="_blank" rel="noopener noreferrer" class="pr-link">#{run.prNumber}</a>
      {:else}
        <span class="pr-num">#{run.prNumber}</span>
      {/if}
      {#await prStatePromise}
        <span class="state-badge state-loading">...</span>
      {:then prState}
        {#if prState}
          <span class="state-badge state-{prState}">{prState}</span>
        {/if}
      {:catch}
        <span class="state-badge state-closed">?</span>
      {/await}
    </div>
  {:else}
    <div class="pr-row">
      <span class="dim-value">no PR</span>
    </div>
  {/if}

  <!-- Tab strip -->
  <div class="tabs">
    <button type="button" class="tab" class:tab-active={activeTab === 'overview'} onclick={() => { activeTab = 'overview'; }}>Overview</button>
    <button type="button" class="tab" class:tab-active={activeTab === 'diff'} onclick={() => { activeTab = 'diff'; }}>Diff</button>
    <button type="button" class="tab" class:tab-active={activeTab === 'judge'} onclick={() => { activeTab = 'judge'; }}>Judge</button>
  </div>

  <!-- Scrollable body -->
  <div class="card-body">
    {#if activeTab === 'overview'}
      <div class="metrics">
        <span class="metric-label">lines</span>
        <span class="metric-value">
          <span class="lines-added">+{run.linesAdded ?? 0}</span>
          <span class="lines-sep">/</span>
          <span class="lines-removed">-{run.linesRemoved ?? 0}</span>
        </span>

        <span class="metric-label">cost</span>
        <span class="metric-value">{formatCost(run.cost_usd)}</span>

        <span class="metric-label">duration</span>
        <span class="metric-value">{formatDuration(run.durationMs)}</span>

        <span class="metric-label">turns</span>
        <span class="metric-value">{run.turns ?? '--'}</span>

        <span class="metric-label">checks</span>
        <span class="metric-value">
          <span class="check-pass">{cc.passed} pass</span>
          {#if cc.failed > 0}
            <span class="check-fail">{cc.failed} fail</span>
          {/if}
        </span>
      </div>
    {:else if activeTab === 'diff'}
      {#if run.prNumber != null}
        <PRDiffLoader autoLoad {organization} {repoName} prNumber={run.prNumber} prUrl={run.prUrl} />
      {:else}
        <div class="dim-placeholder">No PR yet</div>
      {/if}
    {:else if activeTab === 'judge'}
      {#if review}
        <div class="scores-grid">
          <span class="metric-label">adherence</span>
          <span class="metric-value">{review.scores.adherence}/10</span>
          <span class="metric-label">quality</span>
          <span class="metric-value">{review.scores.quality}/10</span>
          <span class="metric-label">completeness</span>
          <span class="metric-value">{review.scores.completeness}/10</span>
        </div>

        <div class="review-summary">{review.verdict}</div>

        {#if review.suggestions && review.suggestions.length > 0}
          <div class="review-category suggestions-border">
            <div class="category-label suggestions-label">suggestions</div>
            {#each review.suggestions as item, idx (item)}
              {#if idx > 0}<div class="category-divider"></div>{/if}
              <div class="category-item suggestion-text">{item}</div>
            {/each}
          </div>
        {/if}

        {#if onRefine && review.suggestions && review.suggestions.length > 0}
          <button
            class="action-btn refine-btn"
            onclick={() => onRefine(run.id, review.suggestions!)}
          >
            Refine
          </button>
        {/if}
      {:else if !completed && run.prNumber != null}
        <div class="judge-empty">
          <span class="judge-empty-desc">Use the workflow strip above to review this PR.</span>
        </div>
      {:else}
        <div class="dim-placeholder">No review available.</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* ── Card ────────────────────────────────────────────────────────────── */

  .agent-card {
    font-family: "JetBrains Mono", monospace;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 320px;
    max-height: 680px;
  }

  .agent-card.winner-card {
    border-left: 3px solid var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 3%, var(--color-surface));
  }

  /* ── Header ──────────────────────────────────────────────────────────── */

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .agent-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .agent-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }

  .model-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
    line-height: 1.6;
    margin-left: auto;
  }

  /* ── PR row ──────────────────────────────────────────────────────────── */

  .pr-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .pr-link {
    font-size: 12px;
    color: var(--color-accent);
    text-decoration: none;
    font-variant-numeric: tabular-nums;
  }

  .pr-link:hover {
    text-decoration: underline;
  }

  .pr-num {
    font-size: 12px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .dim-value {
    font-size: 12px;
    color: var(--color-dim);
  }

  .dim-placeholder {
    font-size: 11px;
    color: var(--color-dim);
    font-style: italic;
    padding: 8px 0;
  }

  /* ── State badges ────────────────────────────────────────────────────── */

  .state-badge {
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 3px;
    line-height: 1.4;
  }

  .state-loading {
    color: var(--color-dim);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .state-open {
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  }

  .state-merged {
    color: var(--color-merged);
    background: color-mix(in srgb, var(--color-merged) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-merged) 25%, transparent);
  }

  .state-closed {
    color: var(--color-dim);
    background: color-mix(in srgb, var(--color-dim) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-dim) 25%, transparent);
  }

  /* ── Score & rank badges ─────────────────────────────────────────────── */

  .score-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .rank-badge {
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 3px;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  /* ── Tabs (Feed.svelte pattern) ──────────────────────────────────────── */

  .tabs {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
    flex-shrink: 0;
  }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 10px;
    border-radius: 3px;
    border: none;
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, background 0.1s;
    flex: 1;
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active { background: var(--color-surface); color: var(--color-text); }

  /* ── Card body (scrollable) ──────────────────────────────────────────── */

  .card-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: auto;
    padding-right: 4px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ── Metrics grid ────────────────────────────────────────────────────── */

  .metrics {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    padding: 4px 0;
  }

  .metric-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
    line-height: 1.8;
  }

  .metric-value {
    font-size: 12px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    line-height: 1.8;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ── Lines ───────────────────────────────────────────────────────────── */

  .lines-added {
    font-size: 12px;
    color: var(--color-success);
    font-variant-numeric: tabular-nums;
  }

  .lines-sep {
    font-size: 10px;
    color: var(--color-dim);
    margin: 0 1px;
  }

  .lines-removed {
    font-size: 12px;
    color: var(--color-danger, var(--color-warning));
    font-variant-numeric: tabular-nums;
  }

  /* ── Checks ──────────────────────────────────────────────────────────── */

  .check-pass {
    font-size: 11px;
    color: var(--color-success);
    font-variant-numeric: tabular-nums;
  }

  .check-fail {
    font-size: 11px;
    color: var(--color-danger, var(--color-warning));
    font-variant-numeric: tabular-nums;
    margin-left: 4px;
  }

  /* ── Buttons ─────────────────────────────────────────────────────────── */

  .action-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }

  .action-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    border-color: var(--color-accent);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .refine-btn {
    margin-top: 4px;
    align-self: flex-start;
  }

  /* ── Judge empty state ───────────────────────────────────────────────── */

  .judge-empty {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 0;
  }

  .judge-empty-desc {
    font-size: 11px;
    color: var(--color-dim);
    line-height: 1.5;
  }

  /* ── Scores grid (modern review) ─────────────────────────────────────── */

  .scores-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    padding: 4px 0;
  }

  /* ── Review summary & categories ─────────────────────────────────────── */

  .review-summary {
    font-size: 12px;
    color: var(--color-muted);
    line-height: 1.55;
  }

  .review-category {
    padding-left: 10px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .review-category.suggestions-border {
    border-left: 2px solid var(--color-muted);
  }

  .category-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 4px;
  }

  .category-label.suggestions-label {
    color: var(--color-muted);
  }

  .category-item {
    font-size: 11px;
    line-height: 1.55;
    padding: 3px 0;
  }

  .category-item.suggestion-text {
    color: var(--color-dim);
  }

  .category-divider {
    height: 1px;
    background: color-mix(in srgb, var(--color-border) 50%, transparent);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
