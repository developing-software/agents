<script lang="ts">
  import { listPlanRuns, listPrStates } from '$lib/agents/ai/judge.remote';
  import type { ReviewResult, CompareResult } from './plan-types';
  import PlanImplementationCard from './PlanImplementationCard.svelte';
  import WorkflowStrip from './WorkflowStrip.svelte';

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

  // -- Data loading --

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

{#await dataPromise}
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
  {@const completed = planStatus === 'completed'}

  <div class="impl-container">
    <div class="impl-header">
      <span class="section-label">implementations</span>
    </div>

    {#if runs.length === 0}
      <div class="empty-text">No implementations yet. Dispatch agents to start.</div>
    {:else}
      <div class="cards-row">
        {#each runs as run (run.id)}
          <PlanImplementationCard
            {run}
            review={run.prNumber != null ? reviews[run.prNumber] : undefined}
            {judgment}
            {organization}
            {repoName}
            {planId}
            {completed}
            {prStatesPromise}
            onReviewComplete={handleReviewComplete}
            onError={handleError}
            {onRefine}
            {agentColor}
          />
        {/each}
      </div>

      {#if errorMessage}
        <div class="error-banner">
          <span class="error-banner-text">{errorMessage}</span>
          <button class="error-dismiss" onclick={() => { errorMessage = null; }}>dismiss</button>
        </div>
      {/if}

      {#if runs.length >= 2}
        <WorkflowStrip
          {runs}
          {reviews}
          {judgment}
          {organization}
          {repoName}
          {planId}
          {completed}
          onReviewComplete={handleReviewComplete}
          onJudgmentComplete={handleJudgmentComplete}
          onError={handleError}
          {agentColor}
        />
      {/if}
    {/if}
  </div>
{:catch}
  <div class="impl-container">
    <div class="impl-header">
      <span class="section-label">implementations</span>
    </div>
    <div class="error-text">Failed to load implementations</div>
  </div>
{/await}

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
