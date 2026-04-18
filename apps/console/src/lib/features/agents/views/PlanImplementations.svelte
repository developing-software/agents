<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import { listPlanRuns } from '$lib/features/agents/api/judge.remote';
  import type { ReviewResult, CompareResult } from '../ai/components/plan-types';
  import PlanImplementationCard from '../ai/components/PlanImplementationCard.svelte';
  import WorkflowStrip from '../ai/components/WorkflowStrip.svelte';
  import { repoContext } from '$lib/features/git/context.svelte';

  let {
    planId,
    planStatus,
    onDispatchFix,
  }: {
    planId: string;
    planStatus: string;
    onDispatchFix?: (prNumber: number, reviewEventId: string, review: { verdict: string; suggestions?: string[] }) => void;
  } = $props();

  const repo = repoContext.get();

  // -- Data loading --

  const dataQuery = $derived(listPlanRuns({ organization: repo.organization, repoName: repo.repoName, planId }));

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

  // -- Shared state (bridges card ↔ strip) --

  let localReviews = $state<Record<number, ReviewResult>>({});
  let localJudgment = $state<CompareResult | null>(null);
  let errorMessage = $state<string | null>(null);

  function mergedReviews(serverReviews: Record<number, ReviewResult>): Record<number, ReviewResult> {
    return { ...serverReviews, ...localReviews };
  }

  function mergedJudgment(serverJudgment: CompareResult | null): CompareResult | null {
    return localJudgment ?? serverJudgment;
  }

  function handleReviewComplete(prNumber: number, review: ReviewResult) {
    localReviews[prNumber] = review;
  }

  function handleJudgmentComplete(judgment: CompareResult) {
    localJudgment = judgment;
  }

  function handleError(message: string) {
    errorMessage = message;
  }
</script>

<div class="impl-container">
  <div class="impl-header">
    <span class="section-label">implementations</span>
  </div>

  <QueryLoader query={dataQuery}>
    {#snippet loading()}
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
    {/snippet}
    {#snippet error(_)}
      <div class="error-text">Failed to load implementations</div>
    {/snippet}
    {#snippet children(data)}
  {@const reviews = mergedReviews(data.reviews)}
  {@const judgment = mergedJudgment(data.judgment)}
  {@const runs = data.runs}
  {@const completed = planStatus === 'completed'}
  {@const activeRuns = runs.filter(r => {
    const s = r.status ?? r.workflowConclusion;
    return s !== 'failure' && s !== 'cancelled';
  })}
  {@const failedRuns = runs.filter(r => {
    const s = r.status ?? r.workflowConclusion;
    return s === 'failure' || s === 'cancelled';
  })}

    {#if runs.length === 0}
      <div class="empty-text">No implementations yet. Dispatch agents to start.</div>
    {:else}
      {#if activeRuns.length > 0}
        <div class="cards-row">
          {#each activeRuns as run (run.id)}
            <PlanImplementationCard
              {run}
              review={run.prNumber != null ? reviews[run.prNumber] : undefined}
              {judgment}
              {planId}
              {completed}
  
              onReviewComplete={handleReviewComplete}
              onError={handleError}
              {onDispatchFix}
              {agentColor}
            />
          {/each}
        </div>
      {/if}

      {#if failedRuns.length > 0}
        <div class="failed-section">
          <span class="failed-label">failed ({failedRuns.length})</span>
          <div class="cards-row">
            {#each failedRuns as run (run.id)}
              <PlanImplementationCard
                {run}
                review={undefined}
                judgment={null}
                {planId}
                {completed}
    
                onReviewComplete={handleReviewComplete}
                onError={handleError}
                {onDispatchFix}
                {agentColor}
              />
            {/each}
          </div>
        </div>
      {/if}

      {#if activeRuns.length === 0 && failedRuns.length > 0}
        <div class="empty-text">All agent runs failed. Dispatch again to retry.</div>
      {/if}

      {#if errorMessage}
        <div class="error-banner">
          <span class="error-banner-text">{errorMessage}</span>
          <button class="error-dismiss" onclick={() => { errorMessage = null; }}>dismiss</button>
        </div>
      {/if}

      {#if activeRuns.length >= 2}
        <WorkflowStrip
          runs={activeRuns}
          {reviews}
          {judgment}
          {planId}
          {completed}
          onReviewComplete={handleReviewComplete}
          onJudgmentComplete={handleJudgmentComplete}
          onError={handleError}
          {agentColor}
        />
      {/if}
    {/if}
    {/snippet}
  </QueryLoader>
</div>

<style>
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

  .failed-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid color-mix(in srgb, var(--color-danger, var(--color-warning)) 15%, transparent);
  }

  .failed-label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-danger, var(--color-warning));
    letter-spacing: 0.03em;
  }

  .cards-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-start;
  }

  /* ── Error banner ────────────────────────────────────────────────────── */

  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 5px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
  }

  .error-banner-text {
    font-size: 11px;
    color: var(--color-danger);
    line-height: 1.4;
  }

  .error-dismiss {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    background: none;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    text-decoration: underline;
    flex-shrink: 0;
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
