<script lang="ts">
  import type { PageProps } from './$types';
  import PlanList from '$lib/features/agents/plans/PlanList.svelte';
  import PlanKanban from '$lib/features/agents/plans/PlanKanban.svelte';
  import PlanTree from '$lib/features/agents/views/PlanTree.svelte';
  import DispatchDrawer from '$lib/features/agents/dispatch/DispatchDrawer.svelte';
  import DispatchOptions from '$lib/features/agents/dispatch/DispatchOptions.svelte';
  import PlannerDrawer from '$lib/features/agents/ai/components/PlannerDrawer.svelte';
  import { previewPrompt } from '$lib/features/agents/api/dispatch.remote';
  import type { Plan } from '@agents/core/events/plan';

  let { data }: PageProps = $props();

  let view = $state<'list' | 'kanban' | 'tree'>('list');

  type PlanItem = NonNullable<typeof data.plans>[number];

  let drawer = $state<DispatchDrawer>();
  let options = $state<DispatchOptions>();
  let selectedPlan = $state<PlanItem | null>(null);
  let dispatched = $state(new Set<string>());

  let plannerOpen = $state(false);
  let plannerMode = $state<'draft' | 'edit'>('draft');
  let plannerPlan = $state<{ id: string; title: string; status: string } | undefined>(undefined);

  function openDrawer(plan: PlanItem) {
    selectedPlan = plan;
    options!.open();
  }

  async function handleGenerate(options: Plan.ToPromptOptions) {
    const plan = selectedPlan;
    if (!plan) return;
    const { prompt, tags: extTags } = await previewPrompt({
      organization: data.organization,
      repoName: data.repoName,
      planId: plan.id,
      options,
    });
    drawer!.open({
      title: 'Dispatch Plan',
      prompt,
      tags: [`plan:${plan.id}`, ...plan.tags, ...extTags],
      planId: plan.id,
    });
  }

  function handleDispatched() {
    if (selectedPlan) dispatched = new Set([...dispatched, selectedPlan.id]);
  }

  function openPlanner() {
    plannerMode = 'draft';
    plannerPlan = undefined;
    plannerOpen = true;
  }

  function handlePlanCreated(plan: { id: string; title: string; status: string }) {
    plannerMode = 'edit';
    plannerPlan = plan;
  }
</script>

<div>
  <div class="header">
    <span class="title">Plans</span>

    <div class="controls">
      <div class="tabs">
        <button type="button" class="tab" class:tab-active={view === 'list'} onclick={() => { view = 'list'; }}>List</button>
        <button type="button" class="tab" class:tab-active={view === 'kanban'} onclick={() => { view = 'kanban'; }}>Board</button>
        <button type="button" class="tab" class:tab-active={view === 'tree'} onclick={() => { view = 'tree'; }}>Tree</button>
      </div>

      <button type="button" class="planner-btn" onclick={openPlanner}>Planner</button>
      <a href="/{data.provider}/{data.organization}/{data.repoName}/agents/plans/create" class="new-btn">+ New Plan</a>
    </div>
  </div>

  {#if view === 'list'}
    <PlanList plans={data.plans} ondispatch={openDrawer} bind:dispatched />
  {:else if view === 'kanban'}
    <PlanKanban plans={data.plans} ondispatch={openDrawer} bind:dispatched />
  {:else}
    <PlanTree />
  {/if}
</div>

<DispatchOptions
  bind:this={options}
  title="Prepare Plan Dispatch"
  onconfirm={handleGenerate}
/>

<DispatchDrawer
  bind:this={drawer}
  ondispatched={handleDispatched}
/>

<PlannerDrawer
  bind:open={plannerOpen}
  mode={plannerMode}
  plan={plannerPlan}
  onplancreated={handlePlanCreated}
/>

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

  .planner-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s;
  }
  .planner-btn:hover { background: color-mix(in srgb, var(--color-accent) 20%, transparent); }

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
