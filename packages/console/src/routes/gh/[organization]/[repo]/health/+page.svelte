<script lang="ts">
  import type { PageProps } from './$types';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import CheckCard from '$lib/events/health/CheckCard.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { relativeTime } from '$lib/events/helpers';

  let { data }: PageProps = $props();

  let branchInput = $derived(data.branch);
  let expandedKey: string | null = $state(null);
  let artifactContent: string | null = $state(null);
  let artifactContentType: string | null = $state(null);
  let artifactLoading = $state(false);

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

  function onBranchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const value = branchInput.trim();
      if (value) {
        goto(`?branch=${encodeURIComponent(value)}`);
      }
    }
  }

  async function toggleCheck(category: string, name: string) {
    const key = `${category}/${name}`;

    if (expandedKey === key) {
      expandedKey = null;
      return;
    }

    expandedKey = key;
    artifactContent = null;
    artifactContentType = null;
    artifactLoading = true;

    try {
      const res = await fetch(
        `/gh/${page.params.organization}/${page.params.repo}/health/artifact?branch=${encodeURIComponent(data.branch)}&category=${encodeURIComponent(category)}&name=${encodeURIComponent(name)}`
      );
      if (res.ok) {
        artifactContent = await res.text();
        artifactContentType = res.headers.get('content-type');
      } else {
        artifactContent = null;
        artifactContentType = null;
      }
    } catch {
      artifactContent = null;
      artifactContentType = null;
    } finally {
      artifactLoading = false;
    }
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
    <input
      class="branch-input"
      type="text"
      bind:value={branchInput}
      onkeydown={onBranchKeydown}
      placeholder="branch"
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
                expanded={expandedKey === `${check.category}/${check.name}`}
                loading={expandedKey === `${check.category}/${check.name}` && artifactLoading}
                content={expandedKey === `${check.category}/${check.name}` ? artifactContent : null}
                contentType={expandedKey === `${check.category}/${check.name}` ? artifactContentType : null}
                ontoggle={() => toggleCheck(check.category, check.name)}
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

  .branch-input {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    padding: 3px 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    outline: none;
    transition: border-color 0.1s;
  }

  .branch-input:focus {
    border-color: var(--color-accent);
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
