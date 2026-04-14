<script lang="ts">
  import type { PageProps } from './$types';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import CheckCard from '$lib/events/health/CheckCard.svelte';
  import ToolTile from '$lib/events/health/ToolTile.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import BranchSelect from '$lib/ui/BranchSelect.svelte';
  import { relativeTime } from '$lib/events/helpers';

  let { data }: PageProps = $props();

  type Check = (typeof data.checks)[number];

  const groupedChecks = $derived.by(() => {
    const groups: Record<string, Check[]> = {};
    for (const check of data.checks) {
      const list = groups[check.category] ?? (groups[check.category] = []);
      list.push(check);
    }
    return groups;
  });

  const organization = $derived(page.params.organization ?? '');
  const repoName = $derived(page.params.repo ?? '');

  const passing = $derived(data.checks.filter((c) => c.outcome === 'success').length);
  const failing = $derived(data.checks.length - passing);

  function checkId(check: { category: string; name: string }): string {
    return `check-${check.category}-${check.name}`;
  }

  function artifactUrl(category: string, name: string) {
    return `/gh/${organization}/${repoName}/health/artifact?branch=${encodeURIComponent(data.branch)}&category=${encodeURIComponent(category)}&name=${encodeURIComponent(name)}`;
  }

  function onBranchChange(branch: string) {
    goto(`?branch=${encodeURIComponent(branch)}`);
  }

  function scrollToCheck(check: { category: string; name: string }) {
    const el = document.getElementById(checkId(check));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('check-flash');
      setTimeout(() => el.classList.remove('check-flash'), 900);
    }
  }
</script>

<div class="health-page">
  <div class="header-row">
    <div class="header-left">
      <h2 class="heading">Health</h2>
      <div class="sub-row">
        {#if data.timeCreated}
          <span class="meta-pill">
            <span class="meta-pill-label">last run</span>
            <span class="meta-pill-value">{relativeTime(data.timeCreated)}</span>
          </span>
        {/if}
        {#if data.checks.length > 0}
          <span class="meta-pill">
            <span class="meta-pill-label">passing</span>
            <span class="meta-pill-value meta-pass">{passing}/{data.checks.length}</span>
          </span>
          {#if failing > 0}
            <span class="meta-pill">
              <span class="meta-pill-label">failing</span>
              <span class="meta-pill-value meta-fail">{failing}</span>
            </span>
          {/if}
        {/if}
      </div>
    </div>
    <BranchSelect
      {organization}
      {repoName}
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
    <div class="dashboard">
      {#each data.checks as check (`${check.category}/${check.name}`)}
        <ToolTile
          category={check.category}
          name={check.name}
          outcome={check.outcome}
          summary={check.summary}
          onclick={() => scrollToCheck(check)}
        />
      {/each}
    </div>

    <div class="checks-list">
      {#each Object.entries(groupedChecks) as [category, checks] (category)}
        <div class="category-group">
          <h3 class="category-header">{category}</h3>
          <div class="cards">
            {#each checks as check (`${check.category}/${check.name}`)}
              <div id={checkId(check)} class="check-anchor">
                <CheckCard
                  category={check.category}
                  name={check.name}
                  outcome={check.outcome}
                  summary={check.summary}
                  artifactUrl={artifactUrl(check.category, check.name)}
                />
              </div>
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
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .heading {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .sub-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .meta-pill {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 2px 8px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-elevated);
    font-family: "JetBrains Mono", monospace;
  }
  .meta-pill-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-dim);
  }
  .meta-pill-value {
    font-size: 11px;
    color: var(--color-text);
    font-weight: 500;
  }
  .meta-pass {
    color: var(--color-success);
  }
  .meta-fail {
    color: var(--color-danger);
  }

  .dashboard {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
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
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-muted);
    letter-spacing: 0.6px;
    margin: 0 0 8px 0;
    font-weight: 500;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .check-anchor {
    scroll-margin-top: 16px;
    border-radius: 4px;
    transition: box-shadow 0.3s ease;
  }

  :global(.check-anchor.check-flash) {
    box-shadow: 0 0 0 2px var(--color-accent);
  }

  @media (max-width: 540px) {
    .dashboard {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 360px) {
    .dashboard {
      grid-template-columns: 1fr;
    }
  }
</style>
