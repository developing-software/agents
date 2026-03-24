<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

{#if data.installation}
  <div class="mx-auto max-w-xl px-6 py-16 text-center">
    <p class="mb-2 text-xs font-medium uppercase tracking-wide text-green-400">
      {data.installation.action === 'update' ? 'Installation updated' : 'App installed'}
    </p>
    <h1 class="mb-4 text-2xl font-semibold text-white">GitHub App connected</h1>
    <p class="mb-8 text-sm text-gray-400">
      The webhook is being processed. Your repository will appear in the console shortly.
    </p>
    <div class="flex items-center justify-center gap-3">
      <a href="/repos" class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
        Go to console →
      </a>
    </div>
  </div>
{:else}
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-24">
    <h1 class="mb-3 text-3xl font-semibold text-white">Agents Console</h1>
    <p class="mb-8 text-sm text-gray-400">Monitor and manage your AI-driven GitHub workflows.</p>
    {#if data.userID}
      <p class="mb-4 font-mono text-xs text-gray-500">{data.userID}</p>
      <a
        href="/repos"
        class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Go to repositories →
      </a>
    {:else}
      <a
        href="/login"
        class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Sign in with GitHub
      </a>
    {/if}
  </div>
{/if}
