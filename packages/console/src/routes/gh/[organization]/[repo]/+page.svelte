<script lang="ts">
  import type { PageProps } from './$types';
  import { generateToken } from './repo.remote';
  let { data }: PageProps = $props();

  let token = $state<string | null>(null);
  let tokenError = $state<string | null>(null);

  async function handleGenerateToken() {
    tokenError = null;
    try {
      const result = await generateToken({});
      token = result.token;
    } catch (err) {
      tokenError = err instanceof Error ? err.message : "Failed to generate token.";
    }
  }
</script>

<div class="grid gap-6 md:grid-cols-2">
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">Recent Issues</h2>
      <a
        href="/gh/{data.organization}/{data.repoName}/issues"
        class="text-xs text-blue-400 hover:underline"
      >
        View all
      </a>
    </div>
    {#if data.issues.length === 0}
      <p class="text-sm text-gray-500">No issues synced yet.</p>
    {:else}
      <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
        {#each data.issues as issue}
          <li class="flex items-start gap-3 px-4 py-3">
            <span
              class="mt-0.5 h-2 w-2 shrink-0 rounded-full {issue.state === 'open'
                ? 'bg-green-500'
                : 'bg-purple-500'}"
            ></span>
            <div class="min-w-0">
              <p class="truncate text-sm text-gray-100">#{issue.number} {issue.title}</p>
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
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Recent Pull Requests
      </h2>
      <a
        href="/gh/{data.organization}/{data.repoName}/pulls"
        class="text-xs text-blue-400 hover:underline"
      >
        View all
      </a>
    </div>
    {#if data.pulls.length === 0}
      <p class="text-sm text-gray-500">No pull requests synced yet.</p>
    {:else}
      <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
        {#each data.pulls as pr}
          <li class="flex items-start gap-3 px-4 py-3">
            <span
              class="mt-0.5 h-2 w-2 shrink-0 rounded-full {pr.state === 'open'
                ? 'bg-green-500'
                : pr.state === 'merged'
                  ? 'bg-purple-500'
                  : 'bg-red-500'}"
            ></span>
            <div class="min-w-0">
              <p class="truncate text-sm text-gray-100">#{pr.number} {pr.title}</p>
              <p class="mt-0.5 text-xs text-gray-500">
                {pr.headBranch} → {pr.baseBranch}
              </p>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<section class="mt-6 rounded-lg border border-gray-800 p-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-sm font-semibold text-gray-200">Agent Token</h2>
      <p class="mt-0.5 text-xs text-gray-500">
        Generate a token and add it as <code class="text-gray-300">AGENTS_TOKEN</code> in your repo's Actions secrets.
      </p>
    </div>
    <button
      onclick={handleGenerateToken}
      class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
    >
      Generate token
    </button>
  </div>

  {#if token}
    <div class="mt-3 rounded bg-gray-900 p-3">
      <p class="mb-1 text-xs text-gray-400">Copy this token — it won't be shown again.</p>
      <code class="break-all text-xs text-green-400">{token}</code>
    </div>
  {/if}

  {#if tokenError}
    <p class="mt-3 text-xs text-red-400">{tokenError}</p>
  {/if}
</section>
