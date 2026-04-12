<script lang="ts">
  import { listPlanRuns, listPrStates, reviewPR, judgePlan, mergeWinner } from '$lib/agents/ai/judge.remote';
  import type { PlanRun, ReviewResult, CompareResult } from './plan-types';
  import PlanImplementationCard from './PlanImplementationCard.svelte';
  import PlanComparisonTable from './PlanComparisonTable.svelte';
  import PlanDiffCompare from './PlanDiffCompare.svelte';
  import { capitalize } from '$lib/events/helpers';

  let {
    organization,
    repoName,
    planId,
    planStatus,
    onRefine,
  }: {
    organization: string;
    repoName: string;
    planId: string;
    planStatus: string;
    onRefine?: (runId: string, suggestions: string[]) => void;
  } = $props();

  // -- Reactive data loading --

  const dataPromise = $derived.by(() => listPlanRuns({ organization, repoName, planId }));
  const prStatesPromise = $derived.by(() =>
    dataPromise.then((data) => {
      const prNumbers = data.runs.map((r) => r.prNumber).filter((n): n is number => n != null);
      if (prNumbers.length === 0) return {} as Record<number, string | null>;
      return listPrStates({ organization, repoName, prNumbers });
    }),
  );

  // -- Agent colors --

  const AGENT_COLORS: Record<string, string> = {
    claude: 'var(--color-accent)',
    codex: 'var(--color-success)',
    opencode: '#e879f9',
  };

  const FALLBACK_COLORS = ['var(--color-warning)', '#f97316', '#06b6d4', '#a78bfa', '#fb923c'];

  function agentColor(agent: string): string {
    if (AGENT_COLORS[agent]) return AGENT_COLORS[agent];
    let hash = 0;
    for (let i = 0; i < agent.length; i++) hash = (hash * 31 + agent.charCodeAt(i)) | 0;
    return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length]!;
  }

  // -- Local state --

  let viewMode = $state<'compare' | 'cards'>('compare');
  let reviewLoading = $state<number | null>(null);
  let reviewAllLoading = $state(false);
  let reviewAllProgress = $state<{ done: number; total: number } | null>(null);
  let judgeLoading = $state(false);
  let mergeLoading = $state(false);
  let localReviews = $state<Record<number, ReviewResult>>({});
  let localJudgment = $state<CompareResult | null>(null);
  let verdictExpanded = $state(false);

  // -- Merge server + local data --

  function mergedReviews(serverReviews: Record<number, ReviewResult>): Record<number, ReviewResult> {
    return { ...serverReviews, ...localReviews };
  }

  function mergedJudgment(serverJudgment: CompareResult | null): CompareResult | null {
    return localJudgment ?? serverJudgment;
  }

  function isMergedOrClosed(planSt: string): boolean {
    return planSt === 'completed';
  }

  function allHaveReviews(runs: PlanRun[], reviews: Record<number, ReviewResult>): boolean {
    const runsWithPr = runs.filter(r => r.prNumber != null);
    if (runsWithPr.length === 0) return false;
    return runsWithPr.every(r => reviews[r.prNumber!] != null);
  }

  function avgScore(scores: { adherence: number; quality: number; completeness: number }): string {
    return ((scores.adherence + scores.quality + scores.completeness) / 3).toFixed(1);
  }

  // -- Actions --

  async function handleReview(run: PlanRun) {
    if (!run.prNumber) return;
    reviewLoading = run.prNumber;
    try {
      const result = await reviewPR({
        organization, repoName, planId,
        agent: run.agent, prNumber: run.prNumber,
        checks: run.checks,
        metrics: { cost_usd: run.cost_usd, durationMs: run.durationMs, linesAdded: run.linesAdded, linesRemoved: run.linesRemoved },
      });
      localReviews[run.prNumber] = result;
    } finally {
      reviewLoading = null;
    }
  }

  async function handleReviewAll(runs: PlanRun[], reviews: Record<number, ReviewResult>) {
    const unreviewed = runs.filter(r => r.prNumber != null && reviews[r.prNumber!] == null);
    if (unreviewed.length === 0) return;
    reviewAllLoading = true;
    reviewAllProgress = { done: 0, total: unreviewed.length };
    try {
      for (const run of unreviewed) {
        await handleReview(run);
        reviewAllProgress = { done: (reviewAllProgress?.done ?? 0) + 1, total: unreviewed.length };
      }
    } finally {
      reviewAllLoading = false;
      reviewAllProgress = null;
    }
  }

  async function handleJudge(runs: PlanRun[], reviews: Record<number, ReviewResult>) {
    judgeLoading = true;
    try {
      const reviewList = runs
        .filter((r): r is PlanRun & { prNumber: number } => r.prNumber != null)
        .map((r) => reviews[r.prNumber])
        .filter((r): r is ReviewResult => r != null);
      const result = await judgePlan({
        organization, repoName, planId,
        reviews: reviewList,
      });
      localJudgment = result;
    } finally {
      judgeLoading = false;
    }
  }

  async function handleMerge(winnerPr: number, allRuns: PlanRun[]) {
    mergeLoading = true;
    try {
      const loserPrNumbers = allRuns
        .filter(r => r.prNumber != null && r.prNumber !== winnerPr)
        .map(r => r.prNumber!);
      await mergeWinner({ organization, repoName, planId, winnerPrNumber: winnerPr, loserPrNumbers });
    } finally {
      mergeLoading = false;
    }
  }
</script>

{#await dataPromise}
  <!-- Skeleton loading -->
  <div class="impl-container">
    <div class="impl-header">
      <span class="section-label">implementations</span>
    </div>
    <div class="cards-row">
      {#each [1, 2] as i (i)}
        <div class="skel-card">
          <div class="skel-header">
            <div class="skel-dot"></div>
            <div class="skel-name"></div>
          </div>
          <div class="skel-rows">
            {#each [1, 2, 3, 4, 5] as j (j)}
              <div class="skel-row">
                <div class="skel-label"></div>
                <div class="skel-value"></div>
              </div>
            {/each}
          </div>
          <div class="skel-btn"></div>
        </div>
      {/each}
    </div>
  </div>
{:then data}
  {@const reviews = mergedReviews(data.reviews)}
  {@const judgment = mergedJudgment(data.judgment)}
  {@const runs = data.runs}
  {@const completed = isMergedOrClosed(planStatus)}
  {@const canJudge = runs.length >= 2 && !judgment && !completed && allHaveReviews(runs, reviews)}
  {@const hasUnreviewed = runs.some(r => r.prNumber != null && reviews[r.prNumber!] == null)}

  <div class="impl-container">
    <div class="impl-header">
      <span class="section-label">implementations</span>
      {#if runs.length >= 2}
        <div class="view-tabs">
          <button class="vtab" class:vtab-active={viewMode === 'compare'} onclick={() => { viewMode = 'compare'; }}>Compare</button>
          <button class="vtab" class:vtab-active={viewMode === 'cards'} onclick={() => { viewMode = 'cards'; }}>Cards</button>
        </div>
      {/if}
    </div>

    {#if runs.length === 0}
      <div class="empty-text">No implementations yet. Dispatch agents to start.</div>
    {:else if viewMode === 'compare' && runs.length >= 2}
      <!-- ── Compare View ──────────────────────────────────────────────── -->

      <!-- Comparison Table -->
      <PlanComparisonTable {runs} {reviews} {judgment} {agentColor} />

      <!-- Judge Workflow Strip -->
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
                onclick={() => handleReviewAll(runs, reviews)}
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
              {@const isReviewing = reviewLoading === run.prNumber}
              <div class="review-status-row">
                <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
                <span class="review-agent-name">{capitalize(run.agent)}</span>
                {#if run.prNumber == null}
                  <span class="review-state dim">no PR</span>
                {:else if hasReview}
                  {@const review = reviews[run.prNumber]}
                  <span class="review-state reviewed">
                    {avgScore(review.scores)}/10
                  </span>
                {:else if isReviewing}
                  <span class="review-state loading">reviewing...</span>
                {:else if !completed}
                  <button
                    class="action-btn action-btn-sm"
                    onclick={() => handleReview(run)}
                  >Review</button>
                {:else}
                  <span class="review-state dim">--</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Step 2: Compare -->
        <div class="workflow-step" class:step-disabled={!allHaveReviews(runs, reviews) && !judgment}>
          <div class="step-header">
            <span class="step-num">2</span>
            <span class="step-title">Compare</span>
            {#if !judgment && !completed}
              <button
                class="action-btn judge-btn"
                disabled={judgeLoading || !canJudge}
                title={canJudge ? 'Compare all implementations' : 'All implementations must be reviewed first'}
                onclick={() => handleJudge(runs, reviews)}
              >
                {judgeLoading ? 'Judging...' : 'Judge All'}
              </button>
            {/if}
          </div>
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
                onclick={() => handleMerge(judgment.winner.prNumber, runs)}
              >
                {mergeLoading ? 'Merging...' : `Merge PR #${judgment.winner.prNumber}`}
              </button>
            {:else if completed}
              <span class="step-done">completed</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Diff Compare -->
      <div class="diff-section">
        <span class="section-label">diffs</span>
        <PlanDiffCompare {runs} {organization} {repoName} {agentColor} />
      </div>

    {:else}
      <!-- ── Cards View ────────────────────────────────────────────────── -->
      <div class="cards-row">
        {#each runs as run (run.id)}
          {@const review = run.prNumber != null ? reviews[run.prNumber] : undefined}
          <PlanImplementationCard
            {run}
            {review}
            {judgment}
            {organization}
            {repoName}
            {completed}
            {prStatesPromise}
            reviewLoading={reviewLoading === run.prNumber}
            onReview={() => handleReview(run)}
            {onRefine}
            {agentColor}
          />
        {/each}
      </div>

      <!-- Verdict section for cards view -->
      {#if judgment}
        <div class="verdict-section">
          <div class="verdict-divider">
            <span class="verdict-divider-label">Verdict</span>
          </div>

          <div class="winner-announce">
            <span class="agent-dot" style="background:{agentColor(judgment.winner.agent)};"></span>
            <span class="winner-announce-text">
              {capitalize(judgment.winner.agent)} wins
              <span class="winner-announce-pr">(PR #{judgment.winner.prNumber})</span>
            </span>
          </div>

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

          {#if !completed}
            <div class="verdict-actions">
              <button
                class="action-btn merge-btn"
                disabled={mergeLoading}
                onclick={() => handleMerge(judgment.winner.prNumber, runs)}
              >
                {mergeLoading ? '...' : `Merge Winner (PR #${judgment.winner.prNumber})`}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </div>
{:catch error}
  <div class="impl-container">
    <div class="impl-header">
      <span class="section-label">implementations</span>
    </div>
    <div class="error-text">Failed to load implementations</div>
  </div>
{/await}

<style>
  /* ── Container ───────────────────────────────────────────────────────── */

  .impl-container {
    font-family: "JetBrains Mono", monospace;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .impl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .section-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .empty-text {
    font-size: 12px;
    color: var(--color-muted);
    padding: 16px 0;
  }

  .error-text {
    font-size: 12px;
    color: var(--color-danger);
  }

  /* ── View tabs ──────────────────────────────────────────────────────── */

  .view-tabs {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
  }

  .vtab {
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
  }
  .vtab:hover { color: var(--color-muted); }
  .vtab-active { background: var(--color-surface); color: var(--color-text); }

  /* ── Cards row ──────────────────────────────────────────────────────── */

  .cards-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-start;
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

  /* ── Workflow Strip ─────────────────────────────────────────────────── */

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

  .review-state.loading {
    color: var(--color-accent);
    font-style: italic;
  }

  .review-state.dim {
    color: var(--color-dim);
  }

  /* ── Verdict inline (compare view) ──────────────────────────────────── */

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

  /* ── Diff section ───────────────────────────────────────────────────── */

  .diff-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
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

  .action-btn-sm {
    font-size: 10px;
    padding: 1px 8px;
    margin-left: 0;
  }

  .review-all-btn {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  }

  .merge-btn {
    border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
    background: color-mix(in srgb, var(--color-success) 8%, transparent);
    color: var(--color-success);
  }

  .merge-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    border-color: var(--color-success);
  }

  .judge-btn {
    border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
    background: color-mix(in srgb, var(--color-warning) 8%, transparent);
    color: var(--color-warning);
  }

  .judge-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-warning) 15%, transparent);
    border-color: var(--color-warning);
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

  /* ── Rankings list ──────────────────────────────────────────────────── */

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

  /* ── Verdict section (cards view) ───────────────────────────────────── */

  .verdict-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .verdict-divider {
    border-top: 1px dashed var(--color-border);
    margin-top: 2px;
    padding-top: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .verdict-divider-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .winner-announce {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    border-radius: 5px;
  }

  .winner-announce-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-accent);
  }

  .winner-announce-pr {
    font-weight: 400;
    font-size: 12px;
    color: var(--color-muted);
    margin-left: 4px;
  }

  .verdict-actions {
    display: flex;
    gap: 6px;
  }

  /* ── Skeleton ───────────────────────────────────────────────────────── */

  .skel-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 14px 16px;
    flex: 1;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skel-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .skel-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skel-name {
    width: 60px;
    height: 13px;
    border-radius: 2px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skel-rows {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
  }

  .skel-row {
    display: contents;
  }

  .skel-label {
    width: 48px;
    height: 10px;
    border-radius: 2px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skel-value {
    width: 56px;
    height: 12px;
    border-radius: 2px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skel-btn {
    width: 60px;
    height: 22px;
    border-radius: 4px;
    background: var(--color-elevated);
    animation: pulse 1.4s ease-in-out infinite;
    margin-top: 4px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
