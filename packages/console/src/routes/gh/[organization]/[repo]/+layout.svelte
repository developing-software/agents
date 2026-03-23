<script lang="ts">
  import { page } from '$app/state';

  let { data, children } = $props();

  const tabs = [
    { label: 'Overview', href: `/gh/${data.organization}/${data.repoName}` },
    { label: 'Issues', href: `/gh/${data.organization}/${data.repoName}/issues` },
    { label: 'Pull Requests', href: `/gh/${data.organization}/${data.repoName}/pulls` },
    { label: 'Actions', href: `/gh/${data.organization}/${data.repoName}/actions` },
  ];

  function isActive(href: string) {
    return page.url.pathname === href;
  }
</script>

<div class="min-h-screen bg-gray-950 text-gray-100">
  <header class="border-b border-gray-800 bg-gray-900 px-6 py-4">
    <div class="flex items-center gap-2 text-sm text-gray-400">
      <a href="/gh" class="hover:text-white">GitHub</a>
      <span>/</span>
      <a href="/gh/{data.organization}" class="hover:text-white">{data.organization}</a>
      <span>/</span>
      <span class="font-semibold text-white">{data.repoName}</span>
    </div>

    {#if data.repo}
      <p class="mt-1 text-xs text-gray-500">
        Default branch: <code class="text-gray-400">{data.repo.defaultBranch ?? 'unknown'}</code>
      </p>
    {/if}

    <nav class="mt-4 flex gap-1">
      {#each tabs as tab}
        <a
          href={tab.href}
          class="rounded-md px-3 py-1.5 text-sm transition-colors {isActive(tab.href)
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
        >
          {tab.label}
        </a>
      {/each}
    </nav>
  </header>

  <main class="mx-auto max-w-5xl px-6 py-8">
    {#if !data.repo}
      <div class="rounded-lg border border-yellow-800 bg-yellow-950 p-4 text-yellow-300 text-sm">
        Repository not found or not yet synced via webhook.
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>
</div>
