<script lang="ts">
  import type { PageProps } from './$types';
  import GitHubLink from '$lib/GitHubLink.svelte';
  let { data }: PageProps = $props();

  let filter = $state<'all' | 'open' | 'closed'>('open');

  const filtered = $derived(
    filter === 'all' ? data.issues : data.issues.filter((i) => i.state === filter)
  );
</script>

<div>
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-lg font-semibold">Issues</h1>
    <div class="flex rounded-lg border border-gray-700 text-sm overflow-hidden">
      {#each (['all', 'open', 'closed'] as const) as f}
        <button
          onclick={() => (filter = f)}
          class="px-3 py-1.5 transition-colors {filter === f
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:bg-gray-800'}"
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      {/each}
    </div>
  </div>

  {#if filtered.length === 0}
    <p class="text-sm text-gray-500">No {filter === 'all' ? '' : filter} issues found.</p>
  {:else}
    <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
      {#each filtered as issue}
        <li class="flex items-start gap-3 px-4 py-3">
          <span
            class="mt-1 h-2 w-2 shrink-0 rounded-full {issue.state === 'open'
              ? 'bg-green-500'
              : 'bg-purple-500'}"
          ></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-100">
              <span class="text-gray-500">#{issue.number}</span>
              {issue.title}
            </p>
            {#if issue.labels && issue.labels.length > 0}
              <div class="mt-1 flex flex-wrap gap-1">
                {#each issue.labels as label}
                  <span class="rounded px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300"
                    >{label}</span
                  >
                {/each}
              </div>
            {/if}
          </div>
          <span class="text-xs text-gray-500 capitalize">{issue.state}</span>
          <GitHubLink href={issue.htmlUrl} />
        </li>
      {/each}
    </ul>
  {/if}
</div>
