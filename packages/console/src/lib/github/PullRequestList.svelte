<script lang="ts">
  import GitHubLink from '$lib/GitHubLink.svelte';
  import { prStateColor, prStateDotStyle } from './github-helpers';

  interface Props {
    organization: string;
    repoName: string;
    pulls: Array<{
      number: number;
      title: string;
      state: string;
      headBranch: string;
      baseBranch: string;
      htmlUrl: string;
    }>;
    emptyText?: string;
  }

  let { organization, repoName, pulls, emptyText = 'No pull requests found.' }: Props = $props();

  let activeFilter = $state<'all' | 'open' | 'merged' | 'closed'>('open');

  const filtered = $derived(
    activeFilter === 'all' ? pulls : pulls.filter((p) => p.state === activeFilter)
  );

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
        </button>
      {/each}
    </div>
  </div>

  <!-- Pull request list -->
  {#if filtered.length === 0}
    <div
      class="flex items-center justify-center py-10 text-xs"
      style="color: var(--color-muted); border: 1px solid var(--color-border); border-radius: 4px;"
    >
      {emptyText}
    </div>
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

          <!-- GitHub link -->
          <div class="shrink-0">
            <GitHubLink href={pr.htmlUrl} />
          </div>

          <!-- Activity link -->
          <a
            href="/gh/{organization}/{repoName}/pulls/{pr.number}"
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
