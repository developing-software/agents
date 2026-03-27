<script lang="ts">
  import type { LayoutProps } from './$types';
  import { page } from '$app/state';

  let { data, children }: LayoutProps = $props();

  const tabs = $derived([
    { label: 'Overview', href: `/gh/${data.organization}/${data.repoName}` },
    { label: 'Files', href: `/gh/${data.organization}/${data.repoName}/tree` },
    { label: 'Issues', href: `/gh/${data.organization}/${data.repoName}/issues` },
    { label: 'Pull Requests', href: `/gh/${data.organization}/${data.repoName}/pulls` },
    { label: 'Actions', href: `/gh/${data.organization}/${data.repoName}/actions` },
  ]);

  function isActive(href: string) {
    return href.includes('/tree')
      ? page.url.pathname.startsWith(href)
      : page.url.pathname === href;
  }
</script>

<header style="background: var(--color-surface); border-bottom: 1px solid var(--color-border);">
  <div class="mx-auto max-w-5xl px-6 pt-4 pb-0">
    <!-- Breadcrumb -->
    <nav class="font-mono text-xs" aria-label="Breadcrumb">
      <ol class="flex items-center gap-1.5">
        <li>
          <a
            href="/gh"
            class="text-muted transition-colors hover:text-text"
          >repos</a>
        </li>
        <li class="text-dim select-none">/</li>
        <li>
          <a
            href="/gh/{data.organization}"
            class="text-muted transition-colors hover:text-text"
          >{data.organization}</a>
        </li>
        <li class="text-dim select-none">/</li>
        <li class="text-text">{data.repoName}</li>
      </ol>
    </nav>

    <!-- Repo name + branch badge -->
    <div class="mt-2 flex items-center gap-3">
      <h1 class="text-lg font-semibold text-text">{data.repoName}</h1>
      {#if data.repo}
        <span
          class="font-mono text-xs px-2 py-0.5 rounded border text-muted"
          style="background: var(--color-elevated); border-color: var(--color-border);"
        >{data.repo.defaultBranch ?? 'unknown'}</span>
      {/if}
    </div>

    <!-- Tab nav -->
    <nav class="mt-3 flex gap-0" aria-label="Repository sections">
      {#each tabs as tab (tab.href)}
        <a
          href={tab.href}
          class="relative px-3 py-2 text-sm transition-colors select-none"
          class:tab-active={isActive(tab.href)}
          class:tab-inactive={!isActive(tab.href)}
        >{tab.label}</a>
      {/each}
    </nav>
  </div>
</header>

<main class="mx-auto max-w-5xl px-6 py-8">
  {#if !data.repo}
    <div
      class="rounded-lg border p-4 text-sm"
      style="border-color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));"
    >
      <span style="color: var(--color-warning);">Repository not found or not yet synced via webhook.</span>
    </div>
  {:else}
    {@render children()}
  {/if}
</main>

<style>
  .tab-active {
    color: var(--color-text);
  }

  .tab-active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-accent);
    border-radius: 2px 2px 0 0;
  }

  .tab-inactive {
    color: var(--color-muted);
  }

  .tab-inactive:hover {
    color: var(--color-text);
  }
</style>
