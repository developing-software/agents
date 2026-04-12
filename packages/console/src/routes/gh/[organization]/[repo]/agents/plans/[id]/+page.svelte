<script lang="ts">
  import type { PageProps } from './$types';
  import PlanDetail from '$lib/agents/plans/PlanDetail.svelte';
  import Events from '$lib/events/repository/Feed.svelte';
  import DispatchDrawer from '$lib/agents/dispatch/DispatchDrawer.svelte';
  import PlannerDrawer from '$lib/agents/ai/components/PlannerDrawer.svelte';
  import PlanImplementations from '$lib/agents/ai/components/PlanImplementations.svelte';
  import { updatePlan, createSubPlan } from '$lib/agents/plans/plans.remote';
  import { PLAN_STATUSES, statusDotColor } from '$lib/agents/plans/plan-helpers';
  import { invalidateAll } from '$app/navigation';
  import { goto } from '$app/navigation';

  let { data }: PageProps = $props();

  let drawerOpen = $state(false);
  let dispatched = $state(false);
  let statusValue = $state(data.plan?.status ?? 'draft');
  let plannerOpen = $state(false);

  async function handleStatusChange(e: Event) {
    if (!data.plan) return;
    const newStatus = (e.target as HTMLSelectElement).value;
    // @ts-expect-error it is safe to pass the value as any since it's validated by the enum
    statusValue = newStatus;
    await updatePlan({ id: data.plan.id, status: newStatus as any });
    invalidateAll();
  }

  function handleDispatched(_planId: string) {
    dispatched = true;
    drawerOpen = false;
  }

  async function handleRefine(runId: string, suggestions: string[]) {
    if (!data.plan) return;
    const body = suggestions.map((s) => `- ${s}`).join('\n');
    const result = await createSubPlan({
      parentEventId: runId,
      title: `Refinement: ${data.plan.title}`,
      body: `## Refinements\n\n${body}\n\n---\n\nBased on review of parent plan: ${data.plan.title}`,
      source: 'repository',
      sourceId: data.plan.sourceId ?? '',
      tags: [...data.plan.tags.filter((t) => !t.startsWith('plan:')), `plan:${data.plan.id}`],
    });
    goto(`/gh/${data.organization}/${data.repoName}/agents/plans/${result.id}`);
  }
</script>

{#if data.plan}
  {#if data.parentEvent}
    <div class="breadcrumb">
      <a href="/gh/{data.organization}/{data.repoName}/agents/plans" class="breadcrumb-link">Plans</a>
      <span class="breadcrumb-sep">›</span>
      {#if data.parentEvent.type === 'plan'}
        <a href="/gh/{data.organization}/{data.repoName}/agents/plans/{data.parentEvent.id}" class="breadcrumb-link">Parent Plan</a>
      {:else}
        <span class="breadcrumb-text">{data.parentEvent.type}</span>
      {/if}
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">{data.plan.title}</span>
    </div>
  {/if}

  <div class="header">
    <a href="/gh/{data.organization}/{data.repoName}/agents/plans" class="back">← Plans</a>
    <span class="title">{data.plan.title}</span>
    <div class="header-actions">
      <select
        class="status-select"
        bind:value={statusValue}
        onchange={handleStatusChange}
        style="border-color: color-mix(in srgb, {statusDotColor(statusValue)} 50%, transparent);"
      >
        {#each PLAN_STATUSES as s (s)}
          <option value={s}>{s}</option>
        {/each}
      </select>
      {#if dispatched}
        <span class="dispatched-badge">dispatched</span>
      {:else}
        <button type="button" class="dispatch-btn" onclick={() => { drawerOpen = true; }}>Dispatch</button>
      {/if}
      <a href="/gh/{data.organization}/{data.repoName}/agents/plans/{data.plan.id}/edit" class="edit-link">Edit</a>
      <button type="button" class="planner-btn" onclick={() => { plannerOpen = true; }}>AI Planner</button>
    </div>
  </div>

  <PlanDetail plan={data.plan} />

  {#if data.plan.status === 'implementing' || data.plan.status === 'completed'}
    <div class="events-section">
      <span class="section-title">Implementations</span>
      <PlanImplementations
        organization={data.organization}
        repoName={data.repoName}
        planId={data.plan.id}
        planStatus={data.plan.status}
        onRefine={handleRefine}
      />
    </div>
  {:else}
    <div class="events-section">
      <span class="section-title">Events</span>
      <Events
        organization={data.organization}
        repoName={data.repoName}
        filterTags={[`plan:${data.plan.id}`]}
        emptyText="No events linked to this plan"
      />
    </div>
  {/if}

  <DispatchDrawer
    plan={data.plan}
    organization={data.organization}
    repoName={data.repoName}
    bind:open={drawerOpen}
    ondispatched={handleDispatched}
  />

  <PlannerDrawer
    bind:open={plannerOpen}
    organization={data.organization}
    repoName={data.repoName}
    mode="edit"
    plan={{ id: data.plan.id, title: data.plan.title, status: data.plan.status }}
  />
{:else}
  <div class="not-found">
    <a href="/gh/{data.organization}/{data.repoName}/agents/plans" class="back">← Plans</a>
    <span class="not-found-text">Plan not found</span>
  </div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 11px;
  }

  .breadcrumb-link {
    color: var(--color-dim);
    text-decoration: none;
  }
  .breadcrumb-link:hover {
    color: var(--color-muted);
  }

  .breadcrumb-sep {
    color: var(--color-dim);
  }

  .breadcrumb-text {
    color: var(--color-dim);
  }

  .breadcrumb-current {
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .back {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
    flex-shrink: 0;
  }
  .back:hover {
    color: var(--color-muted);
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .dispatch-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s;
  }
  .dispatch-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .dispatched-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .status-select {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }
  .status-select:hover,
  .status-select:focus {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
  }

  .planner-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s;
  }
  .planner-btn:hover { background: color-mix(in srgb, var(--color-accent) 20%, transparent); }

  .edit-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
    flex-shrink: 0;
  }
  .edit-link:hover {
    text-decoration: underline;
  }

  .events-section {
    margin-top: 24px;
  }

  .section-title {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 8px;
  }

  .not-found {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .not-found-text {
    font-size: 12px;
    color: var(--color-muted);
  }
</style>
