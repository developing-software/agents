<script lang="ts">
  import { reviewPR, humanReviewPR, listPrStates } from '$lib/features/agents/api/judge.remote';
  import PRDiffLoader from '$lib/features/git/components/PRDiffLoader.svelte';
  import ArtifactList from '$lib/features/events/components/feed/ArtifactList.svelte';
  import type { PlanRun, ReviewResult, CompareResult } from './plan-types';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    run,
    review,
    judgment,
    planId,
    completed,
    onReviewComplete,
    onError,
    onDispatchFix,
    agentColor,
  }: {
    run: PlanRun;
    review: ReviewResult | undefined;
    judgment: CompareResult | null;
    planId: string;
    completed: boolean;
    onReviewComplete: (prNumber: number, review: ReviewResult) => void;
    onError: (message: string) => void;
    onDispatchFix?: (prNumber: number, reviewEventId: string, review: { verdict: string; suggestions?: string[] }) => void;
    agentColor: (agent: string) => string;
  } = $props();

  const { provider, organization, repoName } = repoContext.get();

  const prStatesQuery = $derived(
    run.prNumber != null ? listPrStates({ organization, repoName, prNumbers: [run.prNumber] }) : null,
  );
  const prState = $derived(
    prStatesQuery?.current && run.prNumber != null ? prStatesQuery.current[run.prNumber] ?? null : null,
  );

  let activeTab = $state<'overview' | 'diff' | 'judge' | 'artifacts'>('overview');

  // -- Review state (owned by card) --
  let reviewLoading = $state(false);
  let editing = $state(false);
  let editScores = $state({ adherence: 7, quality: 7, completeness: 7 });
  let editVerdict = $state('');
  let editSaving = $state(false);

  const rankEntry = $derived(judgment?.rankings.find(r => r.prNumber === run.prNumber));
  const isWinner = $derived(judgment != null && run.prNumber != null && judgment.winner.prNumber === run.prNumber);
  const effectiveStatus = $derived(run.status ?? run.workflowConclusion);
  const isFailed = $derived(effectiveStatus === 'failure' || effectiveStatus === 'cancelled');
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

  function avgScore(scores: { adherence: number; quality: number; completeness: number }): string {
    return ((scores.adherence + scores.quality + scores.completeness) / 3).toFixed(1);
  }

  // -- Review actions --

  async function handleReview() {
    if (!run.prNumber) return;
    reviewLoading = true;
    try {
      const result = await reviewPR({
        organization, repoName, planId,
        runId: run.id,
        agent: run.agent, prNumber: run.prNumber,
        checks: run.checks,
        metrics: { cost_usd: run.cost_usd, durationMs: run.durationMs, linesAdded: run.linesAdded, linesRemoved: run.linesRemoved },
      });
      onReviewComplete(run.prNumber, result);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Review failed');
    } finally {
      reviewLoading = false;
    }
  }

  function startEdit(existing?: ReviewResult) {
    editing = true;
    if (existing) {
      editScores = { ...existing.scores };
      editVerdict = existing.verdict;
    } else {
      editScores = { adherence: 7, quality: 7, completeness: 7 };
      editVerdict = '';
    }
  }

  async function saveHumanReview() {
    if (!run.prNumber) return;
    editSaving = true;
    try {
      const result = await humanReviewPR({
        organization, repoName, planId,
        runId: run.id,
        agent: run.agent, prNumber: run.prNumber,
        scores: editScores,
        verdict: editVerdict,
      });
      onReviewComplete(run.prNumber, result);
      editing = false;
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Save review failed');
    } finally {
      editSaving = false;
    }
  }
</script>

<div class="agent-card" class:winner-card={isWinner} class:failed-card={isFailed}>
  <!-- Header: agent name + model + status + score + rank -->
  <div class="card-header">
    <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
    <span class="agent-name">{capitalize(run.agent)}</span>
    {#if effectiveStatus}
      <span class="status-badge status-{effectiveStatus}">{effectiveStatus}</span>
    {/if}
    {#if run.model}
      <span class="model-tag">{run.model}</span>
    {/if}
    {#if review}
      <span class="score-badge">{avgScore(review.scores)}/10</span>
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
      {#if prStatesQuery?.loading && !prState}
        <span class="state-badge state-loading">...</span>
      {:else if prStatesQuery?.error}
        <span class="state-badge state-closed">?</span>
      {:else if prState}
        <span class="state-badge state-{prState}">{prState}</span>
      {/if}
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
    <button type="button" class="tab" class:tab-active={activeTab === 'artifacts'} onclick={() => { activeTab = 'artifacts'; }}>Artifacts</button>
  </div>

  <!-- Scrollable body -->
  <div class="card-body">
    {#if activeTab === 'overview'}
      {#if isFailed && run.finalMessage}
        <div class="failure-message">{run.finalMessage}</div>
      {/if}

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

        {#if run.runUrl}
          <span class="metric-label">workflow</span>
          <span class="metric-value">
            <a href={run.runUrl} target="_blank" rel="noopener noreferrer" class="run-link">view run</a>
          </span>
        {/if}
      </div>
    {:else if activeTab === 'diff'}
      {#if run.prNumber != null}
        <PRDiffLoader autoLoad prNumber={run.prNumber} prUrl={run.prUrl} />
      {:else}
        <div class="dim-placeholder">No PR yet</div>
      {/if}
    {:else if activeTab === 'artifacts'}
      <ArtifactList eventId={run.id} />
    {:else if activeTab === 'judge'}
      {#if editing && run.prNumber != null}
        <!-- Human review form -->
        <div class="human-review-form">
          <div class="score-inputs">
            <label class="score-input-label">
              adh
              <input type="number" min="1" max="10" class="score-input" bind:value={editScores.adherence} />
            </label>
            <label class="score-input-label">
              qual
              <input type="number" min="1" max="10" class="score-input" bind:value={editScores.quality} />
            </label>
            <label class="score-input-label">
              comp
              <input type="number" min="1" max="10" class="score-input" bind:value={editScores.completeness} />
            </label>
          </div>
          <textarea
            class="verdict-input"
            rows="2"
            placeholder="Verdict..."
            bind:value={editVerdict}
          ></textarea>
          <div class="form-actions">
            <button
              class="action-btn"
              disabled={editSaving || !editVerdict.trim()}
              onclick={saveHumanReview}
            >{editSaving ? 'Saving...' : 'Save'}</button>
            <button
              class="action-btn cancel-btn"
              onclick={() => { editing = false; }}
            >Cancel</button>
          </div>
        </div>
      {:else if review}
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

        <div class="judge-actions">
          {#if !completed}
            <button class="action-btn" onclick={() => startEdit(review)}>Edit Review</button>
          {/if}
          {#if onDispatchFix && run.prNumber != null && review.eventId && !completed}
            <button
              class="action-btn fix-btn"
              onclick={() => onDispatchFix(run.prNumber!, review.eventId!, { verdict: review.verdict, suggestions: review.suggestions })}
            >
              Fix
            </button>
          {/if}
        </div>
      {:else if !completed && run.prNumber != null}
        <div class="judge-actions">
          <button
            class="action-btn"
            disabled={reviewLoading}
            onclick={handleReview}
          >
            {reviewLoading ? 'Reviewing...' : 'Review'}
          </button>
          <button class="action-btn" onclick={() => startEdit()}>Manual</button>
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

  .agent-card.failed-card {
    border-left: 3px solid var(--color-danger, var(--color-warning));
    background: color-mix(in srgb, var(--color-danger, var(--color-warning)) 3%, var(--color-surface));
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

  /* ── Status badge ────────────────────────────────────────────────────── */

  .status-badge {
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 3px;
    line-height: 1.4;
    font-weight: 500;
  }

  .status-success {
    color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .status-failure {
    color: var(--color-danger, var(--color-warning));
    background: color-mix(in srgb, var(--color-danger, var(--color-warning)) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger, var(--color-warning)) 25%, transparent);
  }

  .status-cancelled {
    color: var(--color-dim);
    background: color-mix(in srgb, var(--color-dim) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-dim) 25%, transparent);
  }

  /* ── Failure message ────────────────────────────────────────────────── */

  .failure-message {
    font-size: 11px;
    color: var(--color-danger, var(--color-warning));
    line-height: 1.5;
    padding: 6px 8px;
    background: color-mix(in srgb, var(--color-danger, var(--color-warning)) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger, var(--color-warning)) 15%, transparent);
    border-radius: 4px;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    max-height: 120px;
    overflow-y: auto;
  }

  /* ── Run link ───────────────────────────────────────────────────────── */

  .run-link {
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .run-link:hover {
    text-decoration: underline;
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

  /* ── Tabs ────────────────────────────────────────────────────────────── */

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

  /* ── Card body ──────────────────────────────────────────────────────── */

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

  /* ── Scores grid ─────────────────────────────────────────────────────── */

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

  /* ── Judge actions ──────────────────────────────────────────────────── */

  .judge-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
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

  .fix-btn {
    border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
    background: color-mix(in srgb, var(--color-warning) 8%, transparent);
    color: var(--color-warning);
  }

  .fix-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    border-color: var(--color-warning);
  }

  .cancel-btn {
    border-color: var(--color-border) !important;
    background: none !important;
    color: var(--color-muted) !important;
  }

  /* ── Human review form ──────────────────────────────────────────────── */

  .human-review-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 4px 0;
  }

  .score-inputs {
    display: flex;
    gap: 10px;
  }

  .score-input-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .score-input {
    width: 42px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 4px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
    text-align: center;
  }

  .score-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .verdict-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 6px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-text);
    resize: vertical;
    line-height: 1.4;
  }

  .verdict-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-actions {
    display: flex;
    gap: 6px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
