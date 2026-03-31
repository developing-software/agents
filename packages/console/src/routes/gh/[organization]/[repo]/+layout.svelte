<script lang="ts">
  import type { LayoutProps } from './$types';
  import { page } from '$app/state';

  let { data, children }: LayoutProps = $props();

  const tabs = $derived([
    { label: 'Overview', href: `/gh/${data.organization}/${data.repoName}` },
    { label: 'Files', href: `/gh/${data.organization}/${data.repoName}/tree` },
    { label: 'Issues', href: `/gh/${data.organization}/${data.repoName}/issues` },
    { label: 'Pull Requests', href: `/gh/${data.organization}/${data.repoName}/pulls` },
    { label: 'Agents', href: `/gh/${data.organization}/${data.repoName}/agents` },
    { label: 'Actions', href: `/gh/${data.organization}/${data.repoName}/actions` },
  ]);

  function isActive(href: string) {
    if (href.includes('/tree') || href.includes('/agents')) {
      return page.url.pathname.startsWith(href);
    }
    return page.url.pathname === href;
  }
</script>

<div class="repo-header">
  <nav class="tab-nav" aria-label="Repository sections">
    <div class="tab-list">
      {#each tabs as tab (tab.href)}
        <a
          href={tab.href}
          class="tab"
          class:tab-active={isActive(tab.href)}
        >{tab.label}</a>
      {/each}
    </div>
    {#if data.repo?.defaultBranch}
      <span class="branch-label">{data.repo.defaultBranch}</span>
    {/if}
  </nav>
</div>

{#if !data.repo}
  <div class="warning-bar">
    Repository not found or not yet synced via webhook.
  </div>
{:else}
  <div class="content-area">
    {@render children()}
  </div>
{/if}

<style>
  .repo-header {
    height: 38px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
  }

  .tab-nav {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    width: 100%;
    padding: 0 16px;
  }

  .tab-list {
    display: flex;
    align-items: stretch;
    gap: 0;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
    font-size: 13px;
    text-decoration: none;
    color: var(--color-muted);
    height: 38px;
    border-bottom: 2px solid transparent;
    transition: color 0.1s;
    white-space: nowrap;
    line-height: 1;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab-active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .tab-active:hover {
    color: var(--color-accent);
  }

  .branch-label {
    display: flex;
    align-items: center;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .warning-bar {
    padding: 6px 24px;
    font-size: 12px;
    color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));
    border-bottom: 1px solid color-mix(in srgb, var(--color-warning) 20%, transparent);
  }

  .content-area {
    padding: 20px 24px;
  }
</style>
