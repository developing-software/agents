<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<div class="mx-auto max-w-4xl px-6 py-10">
  <div class="mb-6 flex items-center gap-2 text-sm text-gray-400">
    <a href="/" class="hover:text-white">Home</a>
    <span>/</span>
    <span class="font-semibold text-white">{data.organization}</span>
  </div>

  <h1 class="mb-6 text-xl font-semibold">{data.organization}</h1>

  {#if data.repos.length === 0}
    <div class="rounded-lg border border-gray-800 p-8 text-center text-sm text-gray-500">
      No repositories found for this organization.
    </div>
  {:else}
    <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
      {#each data.repos as repo}
        <li>
          <a
            href="/gh/{repo.owner}/{repo.repo}"
            class="flex items-center justify-between px-4 py-4 hover:bg-gray-900 transition-colors"
          >
            <div>
              <p class="text-sm font-medium text-gray-100">{repo.repo}</p>
              <p class="mt-0.5 text-xs text-gray-500">{repo.fullName}</p>
            </div>
            {#if repo.defaultBranch}
              <span class="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                {repo.defaultBranch}
              </span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
