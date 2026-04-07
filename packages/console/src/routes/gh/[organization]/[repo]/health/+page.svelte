<script lang="ts">
  import type { PageProps } from './$types';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import CheckCard from '$lib/events/health/CheckCard.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import BranchSelect from '$lib/ui/BranchSelect.svelte';
  import { relativeTime } from '$lib/events/helpers';

  let { data }: PageProps = $props();

  const groupedChecks = $derived.by(() => {
    const groups: Record<string, typeof data.checks> = {};
    for (const check of data.checks) {
      if (!groups[check.category]) {
        groups[check.category] = [];
      }
      groups[check.category].push(check);
    }
    return groups;
  });

  function artifactUrl(category: string, name: string) {
    return `/gh/${page.params.organization}/${page.params.repo}/health/artifact?branch=${encodeURIComponent(data.branch)}&category=${encodeURIComponent(category)}&name=${encodeURIComponent(name)}`;
  }

  function onBranchChange(branch: string) {
    goto(`?branch=${encodeURIComponent(branch)}`);
  }
</script>

<div class="health-page">
  <div class="header-row">
    <div class="header-left">
      <h2 class="heading">Health</h2>
      {#if data.timeCreated}
        <span class="last-run">Last run: {relativeTime(data.timeCreated)}</span>
      {/if}
    </div>
    <BranchSelect
      organization={page.params.organization}
      repoName={page.params.repo}
      value={data.branch}
      onchange={onBranchChange}
    />
  </div>

  {#if data.checks.length === 0}
    <EmptyState
      icon="default"
      title="No check data"
      description="Check results will appear here after the CI workflow runs."
    />
  {:else}
    <div class="checks-list">
      {#each Object.entries(groupedChecks) as [category, checks] (category)}
        <div class="category-group">
          <h3 class="category-header">{category}</h3>
          <div class="cards">
            {#each checks as check (`${check.category}/${check.name}`)}
              <CheckCard
                category={check.category}
                name={check.name}
                outcome={check.outcome}
                summary={check.summary}
                artifactUrl={artifactUrl(check.category, check.name)}
              />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .health-page {
    width: 100%;
  }

  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .heading {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .last-run {
    font-size: 12px;
    color: var(--color-muted);
  }

  .checks-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .category-group {
    margin-top: 16px;
  }

  .category-group:first-child {
    margin-top: 0;
  }

  .category-header {
    font-size: 12px;
    text-transform: uppercase;
    color: var(--color-muted);
    letter-spacing: 0.5px;
    margin: 0 0 8px 0;
    font-weight: 500;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
