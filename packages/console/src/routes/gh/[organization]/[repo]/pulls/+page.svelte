<script lang="ts">
  import type { PageProps } from './$types';
  import GitHubLink from '$lib/GitHubLink.svelte';

  let { data }: PageProps = $props();

  let filter = $state<'all' | 'open' | 'closed' | 'merged'>('open');

  const filtered = $derived(
    filter === 'all' ? data.pulls : data.pulls.filter((p) => p.state === filter)
  );

  function stateColor(state: string): string {
    if (state === 'open') return 'var(--color-success)';
    if (state === 'merged') return 'var(--color-merged)';
    return 'var(--color-danger)';
  }

  function stateDotStyle(state: string): string {
    const color = stateColor(state);
    const glow = state === 'open'
      ? `box-shadow: 0 0 6px ${color};`
      : '';
    return `background: ${color}; ${glow}`;
  }

  function stateBadgeStyle(state: string): string {
    if (state === 'open') return 'background: var(--color-success-dim); color: var(--color-success);';
    if (state === 'merged') return 'background: var(--color-merged-dim); color: var(--color-merged);';
    return 'background: var(--color-danger-dim); color: var(--color-danger);';
  }

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'merged', label: 'Merged' },
    { value: 'closed', label: 'Closed' },
  ] as const;
</script>

<div>
  <!-- Header -->
  <div class="mb-5 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-text">Pull Requests</h1>

    <!-- Filter pill group -->
    <div class="flex gap-1">
      {#each filterOptions as opt (opt.value)}
        <button
          onclick={() => (filter = opt.value)}
          class="rounded-full px-3 py-1 text-sm transition-colors"
          style={filter === opt.value
            ? 'background: var(--color-accent); color: #fff;'
            : 'background: transparent; color: var(--color-muted);'}
          onmouseenter={filter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')
            : undefined}
          onmouseleave={filter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')
            : undefined}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Pull request list -->
  {#if filtered.length === 0}
    <div
      class="flex items-center justify-center rounded-lg border py-12 text-sm"
      style="border-color: var(--color-border); background: var(--color-surface);"
    >
      <span style="color: var(--color-muted);">
        No {filter === 'all' ? '' : filter} pull requests found.
      </span>
    </div>
  {:else}
    <ul
      class="overflow-hidden rounded-lg border"
      style="background: var(--color-surface); border-color: var(--color-border);"
    >
      {#each filtered as pr (pr.number)}
        <li
          class="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          style="border-color: var(--color-border);"
        >
          <!-- State dot -->
          <span
            class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={stateDotStyle(pr.state)}
          ></span>

          <!-- Number -->
          <span
            class="shrink-0 font-mono text-xs"
            style="color: var(--color-muted);"
          >#{pr.number}</span>

          <!-- Title + branch info -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm" style="color: var(--color-text);">{pr.title}</p>
            <p class="mt-0.5 font-mono text-xs" style="color: var(--color-dim);">
              {pr.headBranch} → {pr.baseBranch}
            </p>
          </div>

          <!-- State badge -->
          <span
            class="shrink-0 rounded px-2 py-0.5 text-xs capitalize"
            style={stateBadgeStyle(pr.state)}
          >{pr.state}</span>

          <!-- GitHub link -->
          <GitHubLink href={pr.htmlUrl} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
