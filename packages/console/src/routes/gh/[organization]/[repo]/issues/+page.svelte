<script lang="ts">
  import type { PageProps } from './$types';
  import GitHubLink from '$lib/GitHubLink.svelte';

  let { data }: PageProps = $props();

  let filter = $state<'all' | 'open' | 'closed'>('open');

  const filtered = $derived(
    filter === 'all' ? data.issues : data.issues.filter((i) => i.state === filter)
  );

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ] as const;
</script>

<div>
  <!-- Header -->
  <div class="mb-5 flex items-center justify-between">
    <h1 class="text-lg font-semibold text-text">Issues</h1>

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

  <!-- Issue list -->
  {#if filtered.length === 0}
    <div
      class="flex items-center justify-center rounded-lg border py-12 text-sm"
      style="border-color: var(--color-border); background: var(--color-surface);"
    >
      <span style="color: var(--color-muted);">
        No {filter === 'all' ? '' : filter} issues found.
      </span>
    </div>
  {:else}
    <ul
      class="overflow-hidden rounded-lg border"
      style="background: var(--color-surface); border-color: var(--color-border);"
    >
      {#each filtered as issue (issue.number)}
        <li
          class="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
          style="border-color: var(--color-border);"
        >
          <!-- State dot -->
          <span
            class="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={issue.state === 'open'
              ? 'background: var(--color-success); box-shadow: 0 0 6px var(--color-success);'
              : 'background: var(--color-dim);'}
          ></span>

          <!-- Number -->
          <span
            class="shrink-0 font-mono text-xs"
            style="color: var(--color-muted);"
          >#{issue.number}</span>

          <!-- Title + labels -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm" style="color: var(--color-text);">{issue.title}</p>
            {#if issue.labels && issue.labels.length > 0}
              <div class="mt-1 flex flex-wrap gap-1">
                {#each issue.labels as label (label)}
                  <span
                    class="rounded border px-1.5 py-0.5 font-mono text-xs"
                    style="background: var(--color-elevated); border-color: var(--color-border); color: var(--color-muted);"
                  >{label}</span>
                {/each}
              </div>
            {/if}
          </div>

          <!-- State badge -->
          <span
            class="shrink-0 rounded px-2 py-0.5 text-xs capitalize"
            style={issue.state === 'open'
              ? 'background: var(--color-success-dim); color: var(--color-success);'
              : 'background: var(--color-elevated); color: var(--color-dim);'}
          >{issue.state}</span>

          <!-- GitHub link -->
          <GitHubLink href={issue.htmlUrl} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
