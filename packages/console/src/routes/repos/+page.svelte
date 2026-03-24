<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<div class="mx-auto max-w-4xl px-6 py-10">
  <h1 class="mb-8 text-xl font-semibold">Repositories</h1>

  {#if data.orgs.length === 0}
    <div class="rounded-lg border border-gray-800 p-8 text-center text-sm text-gray-500">
      No repositories synced yet. Install the GitHub App to get started.
    </div>
  {:else}
    <div class="space-y-8">
      {#each data.orgs as { org, repos }}
        <section>
          <a
            href="/gh/{org}"
            class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white"
          >
            <span class="text-gray-500">/</span>
            {org}
          </a>
          <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
            {#each repos as repo}
              <li>
                <a
                  href="/gh/{repo.owner}/{repo.repo}"
                  class="flex items-center justify-between px-4 py-3 hover:bg-gray-900 transition-colors"
                >
                  <span class="text-sm text-gray-100">{repo.repo}</span>
                  {#if repo.defaultBranch}
                    <span class="text-xs text-gray-500">{repo.defaultBranch}</span>
                  {/if}
                </a>
              </li>
            {/each}
          </ul>
        </section>
      {/each}
    </div>
  {/if}
</div>
