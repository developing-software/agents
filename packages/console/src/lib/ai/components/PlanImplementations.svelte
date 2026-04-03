<script lang="ts">
  import { listPlanRuns, reviewPR, judgePlan, mergeWinner } from '$lib/ai/judge.remote';

  let {
    organization,
    repoName,
    planId,
    planStatus,
  }: {
    organization: string;
    repoName: string;
    planId: string;
    planStatus: string;
  } = $props();

  type PlanRun = {
    id: string;
    agent: string;
    model: string | null;
    prNumber: number | null;
    prState: string | null;
    prUrl: string | null;
    runUrl: string | null;
    cost_usd: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
    turns: number | null;
    durationMs: number | null;
    linesAdded: number | null;
    linesRemoved: number | null;
    checks: Array<{ category: string; name: string; outcome: string }>;
    tags: string[];
    timeCreated: string;
  };

  type ReviewResult = {
    agent: string;
    prNumber: number;
    overallScore: number;
    summary: string;
    strengths: string[];
    concerns: string[];
    suggestions: string[];
  };

  type CompareResult = {
    rankings: Array<{
      rank: number;
      agent: string;
      prNumber: number;
      score: number;
      strengths: string[];
      weaknesses: string[];
    }>;
    winner: { agent: string; prNumber: number };
    reasoning: string;
  };

  const dataPromise = $derived.by(() => listPlanRuns({ organization, repoName, planId }));

  let reviewLoading = $state<number | null>(null);
  let judgeLoading = $state(false);
  let mergeLoading = $state(false);
  let localReviews = $state<Record<number, ReviewResult>>({});
  let localJudgment = $state<CompareResult | null>(null);

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

  function checkCounts(checks: Array<{ outcome: string }>): { passed: number; failed: number } {
    let passed = 0;
    let failed = 0;
    for (const c of checks) {
      if (c.outcome === 'success') passed++;
      else failed++;
    }
    return { passed, failed };
  }

  function mergedReviews(serverReviews: Record<number, ReviewResult>): Record<number, ReviewResult> {
    return { ...serverReviews, ...localReviews };
  }

  function mergedJudgment(serverJudgment: CompareResult | null): CompareResult | null {
    return localJudgment ?? serverJudgment;
  }

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

  async function handleJudge(runs: PlanRun[]) {
    judgeLoading = true;
    try {
      const runsWithPr = runs.filter((r): r is PlanRun & { prNumber: number } => r.prNumber != null);
      const result = await judgePlan({
        organization, repoName, planId,
        runs: runsWithPr.map(r => ({
          agent: r.agent, prNumber: r.prNumber,
          checks: r.checks,
          metrics: { cost_usd: r.cost_usd, durationMs: r.durationMs, linesAdded: r.linesAdded, linesRemoved: r.linesRemoved },
        })),
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

  function isWinner(prNumber: number | null, judgment: CompareResult | null): boolean {
    if (!judgment || prNumber == null) return false;
    return judgment.winner.prNumber === prNumber;
  }

  function isMergedOrClosed(planSt: string): boolean {
    return planSt === 'completed';
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

  <div class="impl-container">
    <div class="impl-header">
      <span class="section-label">implementations</span>
      {#if !completed && !judgment && runs.length >= 2}
        <button
          class="action-btn judge-btn"
          disabled={judgeLoading}
          onclick={() => handleJudge(runs)}
        >
          {judgeLoading ? '...' : 'Judge All'}
        </button>
      {/if}
    </div>

    {#if runs.length === 0}
      <div class="empty-text">No implementations yet. Dispatch agents to start.</div>
    {:else}
      <div class="cards-row">
        {#each runs as run (run.id)}
          {@const review = run.prNumber != null ? reviews[run.prNumber] : undefined}
          {@const cc = checkCounts(run.checks)}
          {@const winner = isWinner(run.prNumber, judgment)}

          <div class="agent-card" class:winner-card={winner}>
            <!-- Card header -->
            <div class="card-header">
              <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
              <span class="agent-name">{capitalize(run.agent)}</span>
              {#if run.model}
                <span class="model-tag">{run.model}</span>
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
                {#if run.prState}
                  <span class="state-badge state-{run.prState}">{run.prState}</span>
                {/if}
              </div>
            {:else}
              <div class="pr-row">
                <span class="dim-value">--</span>
              </div>
            {/if}

            <!-- Metrics grid -->
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

            <!-- Actions row -->
            <div class="card-actions">
              {#if !completed && run.prNumber != null}
                <button
                  class="action-btn"
                  disabled={reviewLoading === run.prNumber}
                  onclick={() => handleReview(run)}
                >
                  {reviewLoading === run.prNumber ? '...' : 'Review'}
                </button>
              {/if}
              {#if review}
                <span class="score-badge">{review.overallScore}/10</span>
              {/if}
            </div>

            <!-- Inline review -->
            {#if review}
              <div class="review-divider">
                <span class="review-divider-label">Review</span>
              </div>

              <div class="review-summary">{review.summary}</div>

              {#if review.strengths.length > 0}
                <div class="review-category strengths-border">
                  <div class="category-label strengths-label">strengths</div>
                  {#each review.strengths as item, idx (item)}
                    {#if idx > 0}<div class="category-divider"></div>{/if}
                    <div class="category-item strength-text">{item}</div>
                  {/each}
                </div>
              {/if}

              {#if review.concerns.length > 0}
                <div class="review-category concerns-border">
                  <div class="category-label concerns-label">concerns</div>
                  {#each review.concerns as item, idx (item)}
                    {#if idx > 0}<div class="category-divider"></div>{/if}
                    <div class="category-item concern-text">{item}</div>
                  {/each}
                </div>
              {/if}

              {#if review.suggestions.length > 0}
                <div class="review-category suggestions-border">
                  <div class="category-label suggestions-label">suggestions</div>
                  {#each review.suggestions as item, idx (item)}
                    {#if idx > 0}<div class="category-divider"></div>{/if}
                    <div class="category-item suggestion-text">{item}</div>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        {/each}
      </div>

      <!-- Verdict section (below all cards) -->
      {#if judgment}
        <div class="verdict-section">
          <div class="verdict-divider">
            <span class="verdict-divider-label">Verdict</span>
          </div>

          <div class="winner-announce">
            <span class="agent-dot" style="background:{agentColor(judgment.winner.agent)};"></span>
            <span class="winner-text">
              {capitalize(judgment.winner.agent)} wins
              <span class="winner-pr">(PR #{judgment.winner.prNumber})</span>
            </span>
          </div>

          <div class="rankings-list">
            {#each judgment.rankings as entry (entry.rank)}
              <div class="ranking-entry" class:winner-row={entry.prNumber === judgment.winner.prNumber}>
                <span class="rank-num">#{entry.rank}</span>
                <span class="agent-dot small" style="background:{agentColor(entry.agent)};"></span>
                <span class="rank-agent">{capitalize(entry.agent)}</span>
                <span class="score-badge">{entry.score}/10</span>
                <span class="rank-details">
                  {#if entry.strengths.length > 0}
                    <span class="rank-strengths">{entry.strengths.join(', ')}</span>
                  {/if}
                  {#if entry.weaknesses.length > 0}
                    <span class="rank-weaknesses">{entry.weaknesses.join(', ')}</span>
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

  /* ── Cards row ───────────────────────────────────────────────────────── */

  .cards-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* ── Agent card ──────────────────────────────────────────────────────── */

  .agent-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
    min-width: 280px;
  }

  .agent-card.winner-card {
    border-left: 3px solid var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 3%, var(--color-surface));
  }

  /* ── Card header ─────────────────────────────────────────────────────── */

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .agent-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .agent-dot.small {
    width: 6px;
    height: 6px;
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

  /* ── State badges ────────────────────────────────────────────────────── */

  .state-badge {
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 3px;
    line-height: 1.4;
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

  /* ── Score badge ─────────────────────────────────────────────────────── */

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

  /* ── Card actions ────────────────────────────────────────────────────── */

  .card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
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

  /* ── Review divider ──────────────────────────────────────────────────── */

  .review-divider {
    border-top: 1px dashed var(--color-border);
    margin-top: 4px;
    padding-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .review-divider-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.03em;
  }

  .review-summary {
    font-size: 12px;
    color: var(--color-muted);
    line-height: 1.55;
  }

  /* ── Review categories ───────────────────────────────────────────────── */

  .review-category {
    padding-left: 10px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .review-category.strengths-border {
    border-left: 2px solid var(--color-success);
  }

  .review-category.concerns-border {
    border-left: 2px solid var(--color-warning);
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

  .category-label.strengths-label {
    color: var(--color-success);
  }

  .category-label.concerns-label {
    color: var(--color-warning);
  }

  .category-label.suggestions-label {
    color: var(--color-muted);
  }

  .category-item {
    font-size: 11px;
    line-height: 1.55;
    padding: 3px 0;
  }

  .category-item.strength-text {
    color: color-mix(in srgb, var(--color-success) 80%, var(--color-text));
  }

  .category-item.concern-text {
    color: color-mix(in srgb, var(--color-warning) 80%, var(--color-text));
  }

  .category-item.suggestion-text {
    color: var(--color-dim);
  }

  .category-divider {
    height: 1px;
    background: color-mix(in srgb, var(--color-border) 50%, transparent);
  }

  /* ── Verdict section ─────────────────────────────────────────────────── */

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

  .winner-text {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-accent);
  }

  .winner-pr {
    font-weight: 400;
    font-size: 12px;
    color: var(--color-muted);
    margin-left: 4px;
  }

  /* ── Rankings list ───────────────────────────────────────────────────── */

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

  .rank-strengths {
    font-size: 11px;
    color: var(--color-success);
    line-height: 1.4;
  }

  .rank-weaknesses {
    font-size: 11px;
    color: var(--color-warning);
    line-height: 1.4;
  }

  /* ── Reasoning ───────────────────────────────────────────────────────── */

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

  .verdict-actions {
    display: flex;
    gap: 6px;
  }

  /* ── Skeleton ────────────────────────────────────────────────────────── */

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
