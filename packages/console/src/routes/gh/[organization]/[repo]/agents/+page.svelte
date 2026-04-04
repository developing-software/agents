<script lang="ts">
  import type { PageProps } from './$types';
  import { listAgentRuns } from '$lib/events/agents/agents.remote';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import {
    relativeTime,
    originBadgeStyle,
    issueRef,
    prRef,
    branchTag,
    workflowRef,
    formatBytes,
    capitalize,
    formatCost,
    formatDuration,
    formatTokensCompact,
  } from '$lib/events/helpers';
  import EventOverview from '$lib/events/agents/Overview.svelte';
  import EventAgentsOverview from '$lib/events/agents/AgentsOverview.svelte';
  import ArtifactViewer from '$lib/ui/ArtifactViewer.svelte';
  import { SvelteMap } from 'svelte/reactivity';

  let { data }: PageProps = $props();

  let retryCount = $state(0);
  let expandedId = $state<string | null>(null);

  // ── Artifacts ────────────────────────────────────────────────────────

  type Artifact = { name: string; size: number };

  type ArtifactsFetch =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ok'; items: Artifact[] };

  let artifactsMap = new SvelteMap<string, ArtifactsFetch>();
  let expandedArtifact = $state<string | null>(null);

  function fetchArtifactsForEvent(eventId: string): void {
    if (artifactsMap.has(eventId)) return;
    artifactsMap.set(eventId, { status: 'loading' });
    fetch(`/gh/${data.organization}/${data.repoName}/events/${eventId}/artifacts`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((items) => {
        artifactsMap.set(eventId, { status: 'ok', items: items as Artifact[] });
      })
      .catch((err: unknown) => {
        artifactsMap.set(eventId, {
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }

  /** Merge artifacts from multiple event IDs into a single flat list. */
  function mergedArtifacts(eventIds: string[]): Artifact[] {
    const seen = new Set<string>();
    const result: Artifact[] = [];
    for (const id of eventIds) {
      const entry = artifactsMap.get(id);
      if (entry?.status === 'ok') {
        for (const a of entry.items) {
          if (!seen.has(a.name)) {
            seen.add(a.name);
            result.push(a);
          }
        }
      }
    }
    return result;
  }

  function artifactsLoading(eventIds: string[]): boolean {
    return eventIds.some((id) => artifactsMap.get(id)?.status === 'loading');
  }

  $effect(() => {
    const id = expandedId;
    expandedArtifact = null;
    if (!id) return;

    // We need the runs to look up parentEventId — wait for promise
    runsPromise.then((runs) => {
      const run = runs.find((r) => r.id === id);
      if (!run) return;
      fetchArtifactsForEvent(run.id);
      if (run.parentEventId) fetchArtifactsForEvent(run.parentEventId);
    });
  });

  function toggleArtifact(name: string) {
    expandedArtifact = expandedArtifact === name ? null : name;
  }

  function artifactUrl(eventIds: string[], name: string): string {
    // Find which event ID actually has this artifact
    for (const id of eventIds) {
      const entry = artifactsMap.get(id);
      if (entry?.status === 'ok' && entry.items.some((a) => a.name === name)) {
        return `/gh/${data.organization}/${data.repoName}/events/${id}/artifacts/${name}`;
      }
    }
    return `/gh/${data.organization}/${data.repoName}/events/${eventIds[0]}/artifacts/${name}`;
  }

  const runsPromise = $derived.by(() => {
    void retryCount;
    return listAgentRuns({ organization: data.organization, repoName: data.repoName });
  });

  function retry() {
    retryCount += 1;
  }

  function toggleRow(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function runStatus(
    checks: Array<{ outcome: string }>,
    conclusion: string | null,
  ): 'pass' | 'fail' | 'cancelled' | 'none' {
    if (conclusion === 'cancelled') return 'cancelled';
    if (conclusion === 'failure') return 'fail';
    if (checks.length > 0 && !checks.every((c) => c.outcome === 'success')) return 'fail';
    if (checks.length > 0 || conclusion === 'success') return 'pass';
    return 'none';
  }

  function statusDotColor(status: 'pass' | 'fail' | 'cancelled' | 'none'): string {
    if (status === 'pass') return 'var(--color-success)';
    if (status === 'fail') return 'var(--color-danger)';
    if (status === 'cancelled') return 'var(--color-warning)';
    return 'var(--color-dim)';
  }
</script>

<EventOverview organization={data.organization} repoName={data.repoName} />
<EventAgentsOverview organization={data.organization} repoName={data.repoName} />

<h2 class="section-heading">Agent Runs</h2>

{#await runsPromise}
  <div class="runs-table">
    {#each [1, 2, 3] as i (i)}
      <div class="skeleton-row">
        <div class="skeleton-block" style="width:7px;height:7px;border-radius:50%;"></div>
        <div class="skeleton-block" style="width:56px;height:13px;"></div>
        <div class="skeleton-block" style="width:120px;height:11px;"></div>
        <div class="skeleton-block" style="width:44px;height:11px;"></div>
        <div class="skeleton-block" style="width:48px;height:11px;"></div>
        <div class="skeleton-block" style="width:90px;height:11px;"></div>
        <div class="skeleton-block" style="width:36px;height:16px;border-radius:3px;"></div>
        <div class="skeleton-block" style="width:40px;height:11px;margin-left:auto;"></div>
      </div>
    {/each}
  </div>
{:then runs}
  {#if runs.length === 0}
    <EmptyState icon="agents" title="No agent runs recorded" description="Runs will appear here when agents are triggered via GitHub Actions or CLI." />
  {:else}
    <div class="runs-table">
      {#each runs as run (run.id)}
        {@const status = runStatus(run.checks, run.conclusion)}
        {@const issue = issueRef(run.tags)}
        {@const pr = prRef(run.tags)}
        {@const branch = branchTag(run.tags)}
        {@const ghWorkflow = workflowRef(run.tags)}
        {@const isExpanded = expandedId === run.id}
        {@const eventIds = [run.id, ...(run.parentEventId ? [run.parentEventId] : [])]}
        {@const runArtifacts = mergedArtifacts(eventIds)}

        <div class="run-row-wrap" class:run-row-expanded={isExpanded}>
          <button
            type="button"
            class="run-row"
            onclick={() => toggleRow(run.id)}
          >
            <span class="status-dot" style="background:{statusDotColor(status)};"></span>

            <span class="agent-name">{capitalize(run.agent)}</span>

            {#if run.model}
              <span class="model-name" title={run.model}>{run.model}</span>
            {/if}

            {#if run.cost_usd !== null}
              {@const estimated = run.pricing_heuristic !== null && run.pricing_heuristic !== 'agent-reported'}
              <span
                class="cost"
                class:cost-estimated={estimated}
                title={estimated ? 'Estimated from model pricing' : 'Agent-reported cost'}
              >{#if estimated}~{/if}{formatCost(run.cost_usd)}</span>
            {/if}

            {#if run.durationMs !== null}
              <span class="duration">{formatDuration(run.durationMs)}</span>
            {/if}

            {#if run.input_tokens !== null || run.output_tokens !== null || run.reasoning_tokens !== null}
              <span class="tokens">
                {#if run.input_tokens !== null}{formatTokensCompact(run.input_tokens)} in{/if}
                {#if run.input_tokens !== null && (run.output_tokens !== null || run.reasoning_tokens !== null)}
                  <span class="token-sep">/</span>
                {/if}
                {#if run.output_tokens !== null}{formatTokensCompact(run.output_tokens)} out{/if}
                {#if run.reasoning_tokens !== null}
                  <span class="token-sep">/</span>
                  {formatTokensCompact(run.reasoning_tokens)} reasoning
                {/if}
              </span>
            {/if}

            {#if run.turns !== null}
              <span class="turns">{run.turns} turns</span>
            {/if}

            <span class="badge" style={originBadgeStyle(run.origin)}>{run.origin}</span>

            {#if issue !== null}
              <a
                href="/gh/{data.organization}/{data.repoName}/issues/{issue}"
                class="ref ref-issue"
                onclick={(ev) => ev.stopPropagation()}
              >#{issue}</a>
            {:else if pr !== null}
              <a
                href="/gh/{data.organization}/{data.repoName}/pulls/{pr}"
                class="ref ref-pr"
                onclick={(ev) => ev.stopPropagation()}
              >#{pr}</a>
            {/if}

            <span class="time">{relativeTime(run.timeCreated)}</span>
          </button>

          {#if isExpanded}
            <div class="detail-panel">
              {#if run.checks.length > 0}
                <div class="detail-section">
                  <span class="detail-label">Checks</span>
                  <div class="checks-list">
                    {#each run.checks as check (`${check.category}/${check.name}`)}
                      <div class="check-item">
                        <span
                          class="check-dot"
                          style="background:{check.outcome === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};"
                        ></span>
                        <span class="check-category">{check.category}</span>
                        <span class="check-sep">/</span>
                        <span class="check-name">{check.name}</span>
                        <span
                          class="check-outcome"
                          class:check-passed={check.outcome === 'success'}
                          class:check-failed={check.outcome !== 'success'}
                        >{check.outcome}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="detail-section">
                <span class="detail-label">Tokens</span>
                <div class="token-breakdown">
                  {#if run.input_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Input</span>
                      <span class="token-val">{run.input_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.output_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Output</span>
                      <span class="token-val">{run.output_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.reasoning_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Reasoning</span>
                      <span class="token-val">{run.reasoning_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.cache_read_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Cache read</span>
                      <span class="token-val">{run.cache_read_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.cache_creation_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Cache write</span>
                      <span class="token-val">{run.cache_creation_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                </div>
              </div>

              {#if run.provider || run.pricing_heuristic}
                <div class="detail-section">
                  <span class="detail-label">Pricing</span>
                  <div class="pricing-info">
                    {#if run.provider}
                      <div class="pricing-row">
                        <span class="pricing-key">Provider</span>
                        <span class="pricing-val">{run.provider}</span>
                      </div>
                    {/if}
                    {#if run.pricing_heuristic}
                      {@const isReported = run.pricing_heuristic === 'agent-reported'}
                      <div class="pricing-row">
                        <span class="pricing-key">Cost source</span>
                        <span class="pricing-val">
                          <span class="heuristic-dot" style="background:{isReported ? 'var(--color-success)' : 'var(--color-warning)'};"></span>
                          {isReported ? 'agent-reported' : run.pricing_heuristic === 'models-dev' ? 'estimated (model pricing)' : run.pricing_heuristic}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if run.conclusion || run.agentStatus || branch || ghWorkflow !== null || run.linesAdded !== null || run.linesRemoved !== null || run.prUrl !== null || run.runUrl !== null}
                <div class="detail-section">
                  <span class="detail-label">Context</span>
                  <div class="context-items">
                    {#if run.conclusion}
                      <span
                        class="context-status"
                        class:status-success={run.conclusion === 'success'}
                        class:status-failure={run.conclusion === 'failure'}
                        class:status-cancelled={run.conclusion === 'cancelled'}
                      >workflow: {run.conclusion}</span>
                    {/if}
                    {#if run.agentStatus}
                      <span
                        class="context-status"
                        class:status-success={run.agentStatus === 'success'}
                        class:status-failure={run.agentStatus === 'failure'}
                        class:status-cancelled={run.agentStatus === 'cancelled'}
                      >agent: {run.agentStatus}</span>
                    {/if}
                    {#if branch}
                      <span class="context-branch">&#x2387; {branch}</span>
                    {/if}
                    {#if ghWorkflow !== null}
                      <span class="context-dim">workflow #{ghWorkflow}</span>
                    {/if}
                    {#if run.linesAdded !== null || run.linesRemoved !== null}
                      <span class="context-lines">
                        {#if run.linesAdded !== null}<span class="lines-added">+{run.linesAdded}</span>{/if}{#if run.linesAdded !== null && run.linesRemoved !== null} / {/if}{#if run.linesRemoved !== null}<span class="lines-removed">-{run.linesRemoved}</span>{/if}
                      </span>
                    {/if}
                    {#if run.prUrl !== null}
                      <a href={run.prUrl} class="context-link" target="_blank" rel="noopener">PR</a>
                    {/if}
                    {#if run.runUrl !== null}
                      <a href={run.runUrl} class="context-link" target="_blank" rel="noopener">GH Run</a>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if run.tags.length > 0}
                <div class="detail-section">
                  <span class="detail-label">Tags</span>
                  <div class="tag-list">
                    {#each run.tags as tag (tag)}
                      <span class="tag-pill">{tag}</span>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if artifactsLoading(eventIds)}
                <div class="detail-section">
                  <span class="detail-label">Artifacts</span>
                  <span class="artifacts-loading">loading...</span>
                </div>
              {:else if runArtifacts.length > 0}
                <div class="detail-section">
                  <span class="detail-label">Artifacts</span>
                  <div class="artifact-list">
                    {#each runArtifacts as artifact (artifact.name)}
                      <button
                        type="button"
                        class="artifact-row"
                        class:artifact-row-active={expandedArtifact === artifact.name}
                        onclick={() => toggleArtifact(artifact.name)}
                      >
                        <span class="artifact-name">{artifact.name}</span>
                        <span class="artifact-size">{formatBytes(artifact.size)}</span>
                      </button>
                      {#if expandedArtifact === artifact.name}
                        <ArtifactViewer name={artifact.name} url={artifactUrl(eventIds, artifact.name)} />
                      {/if}
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
{:catch}
  <div class="error">
    <span class="error-text">Failed to load agent runs</span>
    <button type="button" class="retry" onclick={retry}>Retry</button>
  </div>
{/await}

<style>
  /* ------------------------------------------------------------------ */
  /* Heading                                                             */
  /* ------------------------------------------------------------------ */
  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  /* ------------------------------------------------------------------ */
  /* Table container                                                     */
  /* ------------------------------------------------------------------ */
  .runs-table {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  /* ------------------------------------------------------------------ */
  /* Row wrapper                                                         */
  /* ------------------------------------------------------------------ */
  .run-row-wrap {
    display: flex;
    flex-direction: column;
  }

  .run-row-expanded {
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
    border-radius: 3px;
  }

  /* ------------------------------------------------------------------ */
  /* Row button                                                          */
  /* ------------------------------------------------------------------ */
  .run-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    min-width: 0;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .run-row:hover {
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
    border-radius: 2px;
  }

  /* ------------------------------------------------------------------ */
  /* Status dot                                                          */
  /* ------------------------------------------------------------------ */
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Agent name                                                          */
  /* ------------------------------------------------------------------ */
  .agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Model                                                               */
  /* ------------------------------------------------------------------ */
  .model-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
    flex-shrink: 1;
    min-width: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Cost                                                                */
  /* ------------------------------------------------------------------ */
  .cost {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .cost-estimated {
    color: var(--color-warning);
  }

  /* ------------------------------------------------------------------ */
  /* Duration                                                            */
  /* ------------------------------------------------------------------ */
  .duration {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Tokens (compact)                                                    */
  /* ------------------------------------------------------------------ */
  .tokens {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .token-sep {
    color: var(--color-dim);
    margin: 0 1px;
  }

  /* ------------------------------------------------------------------ */
  /* Turns                                                               */
  /* ------------------------------------------------------------------ */
  .turns {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Origin badge                                                        */
  /* ------------------------------------------------------------------ */
  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    line-height: 1.6;
  }

  /* ------------------------------------------------------------------ */
  /* Issue / PR ref                                                      */
  /* ------------------------------------------------------------------ */
  .ref {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-decoration: none;
    flex-shrink: 0;
  }

  .ref:hover {
    text-decoration: underline;
  }

  .ref-issue {
    color: var(--color-success);
  }

  .ref-pr {
    color: var(--color-merged);
  }

  /* ------------------------------------------------------------------ */
  /* Relative time                                                       */
  /* ------------------------------------------------------------------ */
  .time {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }

  /* ------------------------------------------------------------------ */
  /* Detail panel                                                        */
  /* ------------------------------------------------------------------ */
  .detail-panel {
    padding: 4px 8px 10px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Checks detail                                                       */
  /* ------------------------------------------------------------------ */
  .checks-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .check-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .check-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .check-category {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .check-sep {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .check-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
  }

  .check-outcome {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }

  .check-passed {
    color: var(--color-success);
  }

  .check-failed {
    color: var(--color-danger);
  }

  /* ------------------------------------------------------------------ */
  /* Token breakdown detail                                              */
  /* ------------------------------------------------------------------ */
  .token-breakdown {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .token-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .token-key {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    width: 72px;
    flex-shrink: 0;
  }

  .token-val {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  /* ------------------------------------------------------------------ */
  /* Pricing detail                                                      */
  /* ------------------------------------------------------------------ */
  .pricing-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pricing-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pricing-key {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    width: 72px;
    flex-shrink: 0;
  }

  .pricing-val {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .heuristic-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Context detail                                                      */
  /* ------------------------------------------------------------------ */
  .context-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .context-branch {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .context-dim {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .context-status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }

  .status-success { color: var(--color-success); }
  .status-failure { color: var(--color-danger); }
  .status-cancelled { color: var(--color-warning); }

  .context-lines {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }

  .lines-added {
    color: var(--color-success);
  }

  .lines-removed {
    color: var(--color-danger);
  }

  .context-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .context-link:hover {
    text-decoration: underline;
  }

  /* ------------------------------------------------------------------ */
  /* Tags detail                                                         */
  /* ------------------------------------------------------------------ */
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    line-height: 1.6;
  }

  /* ------------------------------------------------------------------ */
  /* Empty state                                                         */
  /* ------------------------------------------------------------------ */
  .empty {
    font-size: 12px;
    color: var(--color-dim);
    margin: 8px 0 0;
  }

  /* ------------------------------------------------------------------ */
  /* Error state                                                         */
  /* ------------------------------------------------------------------ */
  .error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
    border-radius: 3px;
    margin-top: 4px;
  }

  .error-text {
    font-size: 12px;
    color: var(--color-danger);
    flex: 1;
  }

  .retry {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    background: none;
    color: var(--color-danger);
    cursor: pointer;
  }

  /* ------------------------------------------------------------------ */
  /* Skeleton loading                                                    */
  /* ------------------------------------------------------------------ */
  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
  }

  .skeleton-block {
    background: var(--color-elevated);
    border-radius: 3px;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ------------------------------------------------------------------ */
  /* Artifacts                                                           */
  /* ------------------------------------------------------------------ */
  .artifacts-loading {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .artifact-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .artifact-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 6px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    width: 100%;
  }

  .artifact-row:hover {
    border-color: var(--color-dim);
  }

  .artifact-row-active {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  }

  .artifact-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .artifact-size {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex-shrink: 0;
  }
</style>
