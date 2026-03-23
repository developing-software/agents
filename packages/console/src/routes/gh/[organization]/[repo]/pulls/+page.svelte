<script lang="ts">
  let { data } = $props();

  let filter = $state<'all' | 'open' | 'closed' | 'merged'>('open');

  const filtered = $derived(
    filter === 'all' ? data.pulls : data.pulls.filter((p) => p.state === filter)
  );

  function stateColor(state: string) {
    if (state === 'open') return 'bg-green-500';
    if (state === 'merged') return 'bg-purple-500';
    return 'bg-red-500';
  }
</script>

<div>
  <div class="mb-4 flex items-center justify-between">
    <h1 class="text-lg font-semibold">Pull Requests</h1>
    <div class="flex rounded-lg border border-gray-700 text-sm overflow-hidden">
      {#each (['all', 'open', 'merged', 'closed'] as const) as f}
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
    <p class="text-sm text-gray-500">No {filter === 'all' ? '' : filter} pull requests found.</p>
  {:else}
    <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
      {#each filtered as pr}
        <li class="flex items-start gap-3 px-4 py-3">
          <span
            class="mt-1 h-2 w-2 shrink-0 rounded-full {stateColor(pr.state)}"
          ></span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-gray-100">
              <span class="text-gray-500">#{pr.number}</span>
              {pr.title}
            </p>
            <p class="mt-0.5 text-xs text-gray-500">
              <code>{pr.headBranch}</code> → <code>{pr.baseBranch}</code>
            </p>
          </div>
          <span class="text-xs text-gray-500 capitalize">{pr.state}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
