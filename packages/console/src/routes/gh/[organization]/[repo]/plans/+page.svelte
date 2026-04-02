<script lang="ts">
  import type { PageProps } from './$types';
  import PlanList from '$lib/plans/PlanList.svelte';
  import PlanKanban from '$lib/plans/PlanKanban.svelte';
  import DispatchDrawer from '$lib/dispatch/DispatchDrawer.svelte';

  let { data }: PageProps = $props();

  let view = $state<'list' | 'kanban'>('list');

  type PlanItem = NonNullable<typeof data.plans>[number];

  let drawerOpen = $state(false);
  let selectedPlan = $state<PlanItem | null>(null);
  let dispatched = $state(new Set<string>());

  function openDrawer(plan: PlanItem) {
    selectedPlan = plan;
    drawerOpen = true;
  }

  function handleDispatched(planId: string) {
    dispatched = new Set([...dispatched, planId]);
  }
</script>

<div>
  <div class="header">
    <span class="title">Plans</span>

    <div class="controls">
      <div class="tabs">
        <button type="button" class="tab" class:tab-active={view === 'list'} onclick={() => { view = 'list'; }}>List</button>
        <button type="button" class="tab" class:tab-active={view === 'kanban'} onclick={() => { view = 'kanban'; }}>Board</button>
      </div>

      <a href="/gh/{data.organization}/{data.repoName}/plans/create" class="new-btn">+ New Plan</a>
    </div>
  </div>

  {#if view === 'list'}
    <PlanList organization={data.organization} repoName={data.repoName} plans={data.plans} ondispatch={openDrawer} bind:dispatched />
  {:else}
    <PlanKanban organization={data.organization} repoName={data.repoName} plans={data.plans} ondispatch={openDrawer} bind:dispatched />
  {/if}
</div>

{#if selectedPlan}
  <DispatchDrawer
    plan={selectedPlan}
    organization={data.organization}
    repoName={data.repoName}
    bind:open={drawerOpen}
    ondispatched={handleDispatched}
  />
{/if}

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

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
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active { background: var(--color-surface); color: var(--color-text); }

  .new-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 12px;
    border-radius: 4px;
    background: var(--color-accent);
    color: #fff;
    text-decoration: none;
    transition: opacity 0.1s;
  }
  .new-btn:hover { opacity: 0.9; }
</style>
