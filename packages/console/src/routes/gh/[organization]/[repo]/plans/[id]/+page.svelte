<script lang="ts">
  import type { PageProps } from './$types';
  import PlanDetail from '$lib/plans/PlanDetail.svelte';
  import Events from '$lib/events/Events.svelte';

  let { data }: PageProps = $props();
</script>

{#if data.plan}
  <div class="header">
    <a href="/gh/{data.organization}/{data.repoName}/plans" class="back">← Plans</a>
    <span class="title">{data.plan.title}</span>
    <a href="/gh/{data.organization}/{data.repoName}/plans/{data.plan.id}/edit" class="edit-link">Edit</a>
  </div>

  <PlanDetail plan={data.plan} />

  <div class="events-section">
    <span class="section-title">Events</span>
    <Events
      organization={data.organization}
      repoName={data.repoName}
      filterTags={[`plan:${data.plan.id}`]}
      emptyText="No events linked to this plan"
    />
  </div>
{:else}
  <div class="not-found">
    <a href="/gh/{data.organization}/{data.repoName}/plans" class="back">← Plans</a>
    <span class="not-found-text">Plan not found</span>
  </div>
{/if}

<style>
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
