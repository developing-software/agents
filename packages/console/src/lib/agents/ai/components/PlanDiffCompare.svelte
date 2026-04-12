<script lang="ts">
  import type { PlanRun } from './plan-types';
  import PRDiffLoader from '$lib/github/PRDiffLoader.svelte';
  import { capitalize } from '$lib/events/helpers';

  let {
    runs,
    organization,
    repoName,
    agentColor,
  }: {
    runs: PlanRun[];
    organization: string;
    repoName: string;
    agentColor: (agent: string) => string;
  } = $props();

  let selectedIdx = $state(0);
  let sideBySide = $state(false);

  const runsWithPr = $derived(runs.filter(r => r.prNumber != null));
</script>

{#if runsWithPr.length === 0}
  <div class="empty">No PRs to compare</div>
{:else}
  <div class="diff-compare">
    <!-- Tab strip + side-by-side toggle -->
    <div class="toolbar">
      <div class="tabs">
        {#each runsWithPr as run, i (run.id)}
          <button
            class="tab"
            class:tab-active={i === selectedIdx}
            onclick={() => { selectedIdx = i; }}
          >
            <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
            {capitalize(run.agent)}
          </button>
        {/each}
      </div>

      {#if runsWithPr.length === 2}
        <label class="toggle-label">
          <input type="checkbox" bind:checked={sideBySide} class="toggle-input" />
          <span class="toggle-text">Side by side</span>
        </label>
      {/if}
    </div>

    <!-- Diff body -->
    {#if sideBySide && runsWithPr.length === 2}
      <div class="side-by-side">
        {#each runsWithPr as run, i (run.id)}
          <div class="side-panel">
            <div class="panel-label">
              <span class="agent-dot" style="background:{agentColor(run.agent)};"></span>
              <span class="panel-agent-name">{capitalize(run.agent)}</span>
            </div>
            <PRDiffLoader
              autoLoad
              {organization}
              {repoName}
              prNumber={run.prNumber!}
              prUrl={run.prUrl}
            />
          </div>
        {/each}
      </div>
    {:else}
      {#key selectedIdx}
        <PRDiffLoader
          autoLoad
          {organization}
          {repoName}
          prNumber={runsWithPr[selectedIdx].prNumber!}
          prUrl={runsWithPr[selectedIdx].prUrl}
        />
      {/key}
    {/if}
  </div>
{/if}

<style>
  .diff-compare {
    font-family: "JetBrains Mono", monospace;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
    padding: 12px 0;
  }

  /* ── Toolbar ──────────────────────────────────────────────────────── */

  .toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* ── Tabs ─────────────────────────────────────────────────────────── */

  .tabs {
    display: flex;
    gap: 2px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 2px;
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
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tab:hover {
    color: var(--color-muted);
  }

  .tab-active {
    background: var(--color-surface);
    color: var(--color-text);
  }

  /* ── Agent dot ────────────────────────────────────────────────────── */

  .agent-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }

  /* ── Side-by-side toggle ──────────────────────────────────────────── */

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }

  .toggle-input {
    accent-color: var(--color-accent);
    cursor: pointer;
    margin: 0;
  }

  .toggle-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    user-select: none;
  }

  /* ── Side-by-side layout ──────────────────────────────────────────── */

  .side-by-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .side-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .panel-label {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .panel-agent-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }
</style>
