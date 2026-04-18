<script lang="ts">
  import { reviewPR, judgePlan, mergeWinner, humanPickWinner } from '$lib/features/agents/api/judge.remote';
  import type { PlanRun, ReviewResult, CompareResult } from './plan-types';
  import { capitalize } from '$lib/features/events/helpers';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    runs,
    reviews,
    judgment,
    planId,
    completed,
    onReviewComplete,
    onJudgmentComplete,
    onError,
    agentColor,
  }: {
    runs: PlanRun[];
    reviews: Record<number, ReviewResult>;
    judgment: CompareResult | null;
    planId: string;
    completed: boolean;
    onReviewComplete: (prNumber: number, review: ReviewResult) => void;
    onJudgmentComplete: (judgment: CompareResult) => void;
    onError: (message: string) => void;
    agentColor: (agent: string) => string;
  } = $props();

  const repo = repoContext.get();

  let reviewAllLoading = $state(false);
  let reviewAllProgress = $state<{ done: number; total: number } | null>(null);
  let judgeLoading = $state(false);
  let mergeLoading = $state(false);
  let pickingWinner = $state(false);
  let humanPickedPr = $state<number | null>(null);
  let verdictExpanded = $state(false);

  const hasUnreviewed = $derived(runs.some(r => r.prNumber != null && reviews[r.prNumber!] == null));
  const allReviewed = $derived.by(() => {
    const withPr = runs.filter(r => r.prNumber != null);
    return withPr.length > 0 && withPr.every(r => reviews[r.prNumber!] != null);
  });
  const canJudge = $derived(runs.length >= 2 && !judgment && !completed && allReviewed);

  function avgScore(scores: { adherence: number; quality: number; completeness: number }): string {
    return ((scores.adherence + scores.quality + scores.completeness) / 3).toFixed(1);
  }

  async function handleReviewAll() {
    const unreviewed = runs.filter(r => r.prNumber != null && reviews[r.prNumber!] == null);
    if (unreviewed.length === 0) return;
    reviewAllLoading = true;
    reviewAllProgress = { done: 0, total: unreviewed.length };
    try {
      for (const run of unreviewed) {
        if (!run.prNumber) continue;
        try {
          const result = await reviewPR({
            organization: repo.organization, repoName: repo.repoName, planId,
            runId: run.id,
            agent: run.agent, prNumber: run.prNumber,
            checks: run.checks,
            metrics: { cost_usd: run.cost_usd, durationMs: run.durationMs, linesAdded: run.linesAdded, linesRemoved: run.linesRemoved },
          });
          onReviewComplete(run.prNumber, result);
        } catch (e) {
          onError(e instanceof Error ? e.message : `Review failed for ${run.agent}`);
        }
        reviewAllProgress = { done: (reviewAllProgress?.done ?? 0) + 1, total: unreviewed.length };
      }
    } finally {
      reviewAllLoading = false;
      reviewAllProgress = null;
    }
  }

  async function handleJudge() {
    judgeLoading = true;
    try {
      const reviewList = runs
        .filter((r): r is PlanRun & { prNumber: number } => r.prNumber != null)
        .map((r) => reviews[r.prNumber])
        .filter((r): r is ReviewResult => r != null);
      const result = await judgePlan({ organization: repo.organization, repoName: repo.repoName, planId, reviews: reviewList });
      onJudgmentComplete(result);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Judgment failed');
    } finally {
      judgeLoading = false;
    }
  }

  async function handleHumanPick() {
    if (!humanPickedPr) return;
    const winnerRun = runs.find(r => r.prNumber === humanPickedPr);
    if (!winnerRun) return;
    judgeLoading = true;
    try {
      const reviewList = runs
        .filter((r): r is PlanRun & { prNumber: number } => r.prNumber != null)
        .map((r) => reviews[r.prNumber])
        .filter((r): r is ReviewResult => r != null);
      const result = await humanPickWinner({
        organization: repo.organization, repoName: repo.repoName, planId,
        winnerPrNumber: humanPickedPr,
        winnerAgent: winnerRun.agent,
        reviews: reviewList,
      });
      onJudgmentComplete(result);
      pickingWinner = false;
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Pick winner failed');
    } finally {
      judgeLoading = false;
    }
  }

  async function handleMerge() {
    if (!judgment) return;
    mergeLoading = true;
    try {
      const loserPrNumbers = runs
        .filter(r => r.prNumber != null && r.prNumber !== judgment!.winner.prNumber)
        .map(r => r.prNumber!);
      await mergeWinner({ organization: repo.organization, repoName: repo.repoName, planId, winnerPrNumber: judgment.winner.prNumber, loserPrNumbers });
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Merge failed');
    } finally {
      mergeLoading = false;
    }
  }
</script>

<div class="workflow-strip">
  <!-- Step 1: Review -->
  <div class="workflow-step">
    <div class="step-header">
      <span class="step-num">1</span>
      <span class="step-title">Review</span>
      {#if hasUnreviewed && !completed}
        <button
          class="action-btn review-all-btn"
          disabled={reviewAllLoading}
          onclick={handleReviewAll}
        >
          {#if reviewAllLoading && reviewAllProgress}
            Reviewing {reviewAllProgress.done}/{reviewAllProgress.total}...
          {:else}
            Review All
          {/if}
        </button>
      {/if}
    </div>
    <div class="review-statuses">
      {#each runs as run (run.id)}
        {@const hasReview = run.prNumber != null && reviews[run.prNumber] != null}
        <div class="review-status-row">
          <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
          <span class="review-agent-name">{capitalize(run.agent)}</span>
          {#if run.prNumber == null}
            <span class="review-state dim">no PR</span>
          {:else if hasReview}
            <span class="review-state reviewed">{avgScore(reviews[run.prNumber].scores)}/10</span>
          {:else}
            <span class="review-state dim">pending</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Step 2: Compare -->
  <div class="workflow-step" class:step-disabled={!allReviewed && !judgment}>
    <div class="step-header">
      <span class="step-num">2</span>
      <span class="step-title">Compare</span>
      {#if !judgment && !completed}
        <div class="step-actions">
          <button
            class="action-btn judge-btn"
            disabled={judgeLoading || !canJudge}
            title={canJudge ? 'Compare all implementations' : 'All implementations must be reviewed first'}
            onclick={handleJudge}
          >
            {judgeLoading ? 'Judging...' : 'Judge All'}
          </button>
          <button
            class="action-btn pick-btn"
            disabled={judgeLoading}
            onclick={() => { pickingWinner = !pickingWinner; }}
          >
            {pickingWinner ? 'Cancel' : 'Pick Winner'}
          </button>
        </div>
      {/if}
    </div>
    {#if pickingWinner && !judgment && !completed}
      <div class="pick-winner-list">
        {#each runs.filter(r => r.prNumber != null) as run (run.id)}
          <button
            class="pick-option"
            class:pick-selected={humanPickedPr === run.prNumber}
            onclick={() => { humanPickedPr = run.prNumber; }}
          >
            <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
            <span class="pick-agent">{capitalize(run.agent)}</span>
            <span class="pick-pr">PR #{run.prNumber}</span>
            {#if run.prNumber != null && reviews[run.prNumber]}
              <span class="pick-score">{avgScore(reviews[run.prNumber].scores)}/10</span>
            {/if}
          </button>
        {/each}
        <button
          class="action-btn merge-btn"
          disabled={!humanPickedPr || judgeLoading}
          onclick={handleHumanPick}
        >
          {judgeLoading ? 'Saving...' : 'Confirm Pick'}
        </button>
      </div>
    {/if}
    {#if judgment}
      <div class="verdict-inline">
        <button
          class="verdict-toggle"
          onclick={() => { verdictExpanded = !verdictExpanded; }}
        >
          <span class="agent-dot" style="background:{agentColor(judgment.winner.agent)};"></span>
          <span class="winner-text">{capitalize(judgment.winner.agent)} wins</span>
          <span class="winner-pr">PR #{judgment.winner.prNumber}</span>
          <span class="expand-arrow">{verdictExpanded ? '\u25B4' : '\u25BE'}</span>
        </button>
        {#if verdictExpanded}
          <div class="verdict-detail">
            <div class="rankings-list">
              {#each judgment.rankings as entry (entry.rank)}
                <div class="ranking-entry" class:winner-row={entry.prNumber === judgment.winner.prNumber}>
                  <span class="rank-num">#{entry.rank}</span>
                  <span class="agent-dot small" style="background:{agentColor(entry.agent)};"></span>
                  <span class="rank-agent">{capitalize(entry.agent)}</span>
                  <span class="score-badge">{avgScore(entry.scores)}/10</span>
                  <span class="rank-details">
                    <span class="dimension-scores">
                      <span class="dim-score">adh {entry.scores.adherence}</span>
                      <span class="dim-sep">/</span>
                      <span class="dim-score">qual {entry.scores.quality}</span>
                      <span class="dim-sep">/</span>
                      <span class="dim-score">comp {entry.scores.completeness}</span>
                    </span>
                    {#if entry.note}
                      <span class="rank-note">{entry.note}</span>
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
            <div class="reasoning-block">
              <span class="reasoning-label">reasoning</span>
              <p class="reasoning-text">{judgment.reasoning}</p>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Step 3: Merge -->
  <div class="workflow-step" class:step-disabled={!judgment}>
    <div class="step-header">
      <span class="step-num">3</span>
      <span class="step-title">Merge</span>
      {#if judgment && !completed}
        <button
          class="action-btn merge-btn"
          disabled={mergeLoading}
          onclick={handleMerge}
        >
          {mergeLoading ? 'Merging...' : `Merge PR #${judgment.winner.prNumber}`}
        </button>
      {:else if completed}
        <span class="step-done">completed</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .workflow-strip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .workflow-step {
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
  }

  .workflow-step:last-child {
    border-bottom: none;
  }

  .workflow-step.step-disabled {
    opacity: 0.45;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .step-num {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-dim);
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .step-done {
    font-size: 10px;
    color: var(--color-success);
    margin-left: auto;
  }

  .step-actions {
    display: flex;
    gap: 6px;
    margin-left: auto;
  }

  /* ── Review statuses ────────────────────────────────────────────────── */

  .review-statuses {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    padding-left: 24px;
  }

  .review-status-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .review-agent-name {
    font-size: 11px;
    color: var(--color-text);
    width: 80px;
    flex-shrink: 0;
  }

  .review-state {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .review-state.reviewed {
    color: var(--color-success);
    font-weight: 600;
  }

  .review-state.dim {
    color: var(--color-dim);
  }

  /* ── Verdict ────────────────────────────────────────────────────────── */

  .verdict-inline {
    margin-top: 8px;
    padding-left: 24px;
  }

  .verdict-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 0;
    font-family: "JetBrains Mono", monospace;
  }

  .winner-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-accent);
  }

  .winner-pr {
    font-size: 11px;
    color: var(--color-muted);
    font-weight: 400;
  }

  .expand-arrow {
    font-size: 10px;
    color: var(--color-dim);
    margin-left: 4px;
  }

  .verdict-detail {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* ── Rankings ───────────────────────────────────────────────────────── */

  .rankings-list {
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  .ranking-entry {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .ranking-entry:last-child {
    border-bottom: none;
  }

  .ranking-entry.winner-row {
    background: color-mix(in srgb, var(--color-accent) 5%, transparent);
    border-left: 3px solid var(--color-accent);
  }

  .rank-num {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    width: 28px;
    flex-shrink: 0;
  }

  .rank-agent {
    font-size: 12px;
    color: var(--color-text);
    width: 80px;
    flex-shrink: 0;
  }

  .rank-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .dimension-scores {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .dim-score {
    white-space: nowrap;
  }

  .dim-sep {
    color: var(--color-dim);
    font-size: 10px;
  }

  .rank-note {
    font-size: 11px;
    color: var(--color-dim);
    line-height: 1.4;
    font-style: italic;
  }

  /* ── Reasoning ──────────────────────────────────────────────────────── */

  .reasoning-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .reasoning-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--color-dim);
  }

  .reasoning-text {
    margin: 0;
    font-size: 12px;
    color: var(--color-muted);
    line-height: 1.6;
  }

  /* ── Agent dot ──────────────────────────────────────────────────────── */

  .agent-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  .agent-dot.small {
    width: 6px;
    height: 6px;
  }

  /* ── Buttons ────────────────────────────────────────────────────────── */

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
    margin-left: auto;
  }

  .action-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    border-color: var(--color-accent);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .review-all-btn {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  }

  .judge-btn {
    border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
    background: color-mix(in srgb, var(--color-warning) 8%, transparent);
    color: var(--color-warning);
    margin-left: 0;
  }

  .judge-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    border-color: var(--color-warning);
  }

  .merge-btn {
    border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
    background: color-mix(in srgb, var(--color-success) 8%, transparent);
    color: var(--color-success);
    margin-left: 0;
  }

  .merge-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    border-color: var(--color-success);
  }

  .pick-btn {
    border-color: color-mix(in srgb, var(--color-muted) 40%, transparent);
    background: color-mix(in srgb, var(--color-muted) 8%, transparent);
    color: var(--color-muted);
    margin-left: 0;
  }

  .pick-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-muted) 15%, transparent);
    border-color: var(--color-muted);
  }

  /* ── Score badge ────────────────────────────────────────────────────── */

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

  /* ── Pick Winner ────────────────────────────────────────────────────── */

  .pick-winner-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
    padding-left: 24px;
  }

  .pick-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-family: "JetBrains Mono", monospace;
    transition: border-color 0.1s, background 0.1s;
  }

  .pick-option:hover {
    border-color: var(--color-muted);
  }

  .pick-option.pick-selected {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  .pick-agent {
    font-size: 12px;
    color: var(--color-text);
    font-weight: 500;
  }

  .pick-pr {
    font-size: 11px;
    color: var(--color-muted);
  }

  .pick-score {
    font-size: 11px;
    color: var(--color-accent);
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }
</style>
