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
  <div class="mb-4 flex items-center justify-between">
    <span class="text-sm font-medium" style="color: var(--color-text);">Issues</span>

    <!-- Filter pill tabs -->
    <div
      class="flex gap-px overflow-hidden rounded border p-px"
      style="background: var(--color-elevated); border-color: var(--color-border);"
    >
      {#each filterOptions as opt (opt.value)}
        <button
          onclick={() => (filter = opt.value)}
          class="rounded px-2.5 py-1 font-mono text-xs transition-colors"
          style={filter === opt.value
            ? 'background: var(--color-accent); color: #fff;'
            : 'background: transparent; color: var(--color-dim);'}
          onmouseenter={filter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')
            : undefined}
          onmouseleave={filter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')
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
      class="flex items-center justify-center py-10 text-xs"
      style="color: var(--color-muted); border: 1px solid var(--color-border); border-radius: 4px;"
    >
      No {filter === 'all' ? '' : filter} issues found.
    </div>
  {:else}
    <div
      class="overflow-hidden rounded"
      style="border: 1px solid var(--color-border); background: var(--color-surface);"
    >
      {#each filtered as issue, idx (issue.number)}
        <div
          class="issue-row"
          style="border-top: {idx === 0 ? 'none' : '1px solid var(--color-border)'};"
          role="listitem"
        >
            <!-- State dot -->
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              style={issue.state === 'open'
                ? 'background: var(--color-success);'
                : 'background: var(--color-dim);'}
            ></span>

            <!-- Number -->
            <span
              class="shrink-0 font-mono"
              style="width: 40px; font-size: 11px; color: var(--color-dim);"
            >#{issue.number}</span>

            <!-- Title -->
            <span
              class="min-w-0 flex-1 truncate text-xs"
              style="color: var(--color-text);"
            >{issue.title}</span>

            <!-- Labels (max 3) -->
            {#if issue.labels && issue.labels.length > 0}
              <div class="flex shrink-0 gap-1">
                {#each issue.labels.slice(0, 3) as label (label)}
                  <span
                    class="rounded font-mono"
                    style="font-size: 10px; padding: 0 5px; line-height: 17px; background: var(--color-elevated); border: 1px solid var(--color-border); color: var(--color-muted);"
                  >{label}</span>
                {/each}
              </div>
            {/if}

            <!-- State text -->
            <span
              class="shrink-0 font-mono capitalize"
              style="font-size: 10px; width: 40px; text-align: right; color: {issue.state === 'open' ? 'var(--color-success)' : 'var(--color-dim)'};"
            >{issue.state}</span>

            <!-- GitHub link -->
            <div class="shrink-0">
              <GitHubLink href={issue.htmlUrl} />
            </div>

            <!-- Activity link -->
            <a
              href="/gh/{data.organization}/{data.repoName}/issues/{issue.number}"
              class="activity-link"
              title="View activity"
            >activity →</a>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .issue-row {
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
