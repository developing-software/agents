<script lang="ts">
  import type { NormalizedPullRequest } from '@agents/core/git';
  import ProviderLink from './ProviderLink.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { prStateColor, prStateDotStyle } from '../helpers';
  import { repoContext } from '../context.svelte';

  interface Props {
    pulls: NormalizedPullRequest[];
    emptyText?: string;
  }

  let {
    pulls,
    emptyText = 'No pull requests found.',
  }: Props = $props();

  const repo = repoContext.get();

  let activeFilter = $state<'all' | 'open' | 'merged' | 'closed'>('open');

  const filtered = $derived(
    activeFilter === 'all' ? pulls : pulls.filter((p) => p.state === activeFilter)
  );

  const counts = $derived({
    all: pulls.length,
    open: pulls.filter((p) => p.state === 'open').length,
    merged: pulls.filter((p) => p.state === 'merged').length,
    closed: pulls.filter((p) => p.state === 'closed').length,
  });

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'merged', label: 'Merged' },
    { value: 'closed', label: 'Closed' },
  ] as const;
</script>

<div>
  <!-- Filter pill tabs -->
  <div class="mb-4 flex items-center justify-end">
    <div
      class="flex gap-px overflow-hidden rounded border p-px"
      style="background: var(--color-elevated); border-color: var(--color-border);"
    >
      {#each filterOptions as opt (opt.value)}
        <button
          onclick={() => (activeFilter = opt.value)}
          class="rounded px-2.5 py-1 font-mono text-xs transition-colors"
          style={activeFilter === opt.value
            ? 'background: var(--color-accent); color: #fff;'
            : 'background: transparent; color: var(--color-dim);'}
          onmouseenter={activeFilter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')
            : undefined}
          onmouseleave={activeFilter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')
            : undefined}
        >
          {opt.label}
          <span class="count-badge" class:count-badge-active={activeFilter === opt.value}>{counts[opt.value]}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Pull request list -->
  {#if filtered.length === 0}
    <EmptyState icon="pulls" title={emptyText} />
  {:else}
    <div
      class="overflow-hidden rounded"
      style="border: 1px solid var(--color-border); background: var(--color-surface);"
    >
      {#each filtered as pr, idx (pr.number)}
        <div
          class="pr-row"
          style="border-top: {idx === 0 ? 'none' : '1px solid var(--color-border)'};"
          role="listitem"
        >
          <!-- State dot -->
          <span
            class="h-1.5 w-1.5 shrink-0 rounded-full"
            style={prStateDotStyle(pr.state)}
          ></span>

          <!-- Number -->
          <span
            class="shrink-0 font-mono"
            style="width: 40px; font-size: 11px; color: var(--color-dim);"
          >#{pr.number}</span>

          <!-- Title -->
          <span
            class="min-w-0 flex-1 truncate text-xs"
            style="color: var(--color-text);"
          >{pr.title}</span>

          <!-- Branch info -->
          <span
            class="shrink-0 font-mono"
            style="font-size: 11px; color: var(--color-dim); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
          >{pr.headBranch} &rarr; {pr.baseBranch}</span>

          <!-- State text -->
          <span
            class="shrink-0 font-mono capitalize"
            style="font-size: 10px; width: 48px; text-align: right; color: {prStateColor(pr.state)};"
          >{pr.state}</span>

          <!-- Provider link -->
          <div class="shrink-0">
            <ProviderLink href={pr.url} provider={repo.provider} />
          </div>

          <!-- Activity link -->
          <a
            href="/{repo.provider}/{repo.organization}/{repo.repoName}/pulls/{pr.number}"
            class="activity-link"
            title="View activity"
          >activity &rarr;</a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .pr-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    min-height: 36px;
    transition: background 0.08s;
  }
  .pr-row:hover {
    background: var(--color-hover);
  }

  .count-badge {
    font-size: 9px;
    min-width: 16px;
    padding: 0 4px;
    border-radius: 6px;
    text-align: center;
    line-height: 15px;
    display: inline-block;
    margin-left: 4px;
    background: var(--color-border);
    color: var(--color-dim);
  }
  .count-badge-active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }

  .activity-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-decoration: none;
    flex-shrink: 0;
    transition: color 0.1s;
  }
  .activity-link:hover { color: var(--color-accent); }
</style>
