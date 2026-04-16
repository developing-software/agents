<script lang="ts">
  import type { LayoutProps } from './$types';
  import { page } from '$app/state';
  import { repoContext } from '$lib/git-repo/context.svelte';

  let { data, children }: LayoutProps = $props();

  const repo = repoContext.set({
    get provider() { return data.provider; },
    get organization() { return data.organization; },
    get repoName() { return data.repoName; },
  });

  const base = $derived(`/${data.provider}/${data.organization}/${data.repoName}`);

  const defaultRef = $derived(data.repo?.defaultBranch ?? 'main');

  const tabs = $derived([
    { label: 'Overview', href: base },
    { label: 'Files', href: `${base}/tree/${defaultRef}` },
    { label: 'Issues', href: `${base}/issues` },
    { label: 'Pull Requests', href: `${base}/pulls` },
    { label: 'Branches', href: `${base}/branches` },
    { label: 'Agents', href: `${base}/agents` },
    { label: 'Actions', href: `${base}/actions` },
    { label: 'Health', href: `${base}/health` },
  ]);

  function isActive(href: string) {
    if (href === base) return page.url.pathname === href;
    return page.url.pathname.startsWith(href);
  }

  const activeTab = $derived(tabs.find((t) => isActive(t.href)) ?? tabs[0]);
</script>

<div class="repo-header">
  <nav class="tab-nav" aria-label="Repository sections">
    <div class="tab-list" role="tablist">
      {#each tabs as tab (tab.href)}
        <a
          href={tab.href}
          class="tab"
          class:tab-active={isActive(tab.href)}
          role="tab"
          aria-selected={isActive(tab.href)}
        >{tab.label}</a>
      {/each}
    </div>

    <label class="tab-select-wrap">
      <span class="visually-hidden">Repository section</span>
      <select
        class="tab-select"
        value={activeTab.href}
        onchange={(e) => {
          const target = e.currentTarget.value;
          if (target) window.location.href = target;
        }}
      >
        {#each tabs as tab (tab.href)}
          <option value={tab.href}>{tab.label}</option>
        {/each}
      </select>
    </label>

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
    gap: 12px;
    width: 100%;
    padding: 0 16px;
    min-height: 38px;
  }

  /* Desktop: horizontal tab list */
  .tab-list {
    display: flex;
    align-items: stretch;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tab-list::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
    font-size: 13px;
    text-decoration: none;
    color: var(--color-muted);
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

  /* Mobile dropdown (hidden by default) */
  .tab-select-wrap {
    display: none;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .tab-select {
    width: 100%;
    height: 32px;
    font-size: 13px;
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0 10px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .branch-label {
    display: flex;
    align-items: center;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
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

  @media (max-width: 767px) {
    .tab-nav {
      padding: 6px 12px;
    }

    .tab-list {
      display: none;
    }

    .tab-select-wrap {
      display: flex;
    }

    .branch-label {
      display: none;
    }

    .content-area {
      padding: 12px 14px;
    }
  }
</style>
