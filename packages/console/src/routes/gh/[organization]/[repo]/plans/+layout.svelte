<script lang="ts">
  import type { LayoutProps } from './$types';
  import { page } from '$app/state';

  let { data, children }: LayoutProps = $props();

  const basePath = $derived(`/gh/${data.organization}/${data.repoName}/plans`);

  const tabs = $derived([
    { label: 'Plans', href: basePath },
    { label: 'Planner', href: `${basePath}/planner` },
  ]);

  function isActive(href: string) {
    if (href === basePath) {
      return page.url.pathname === basePath;
    }
    return page.url.pathname.startsWith(href);
  }
</script>

<nav class="sub-nav" aria-label="Plans sections">
  <div class="sub-tab-list">
    {#each tabs as tab (tab.href)}
      <a
        href={tab.href}
        class="sub-tab"
        class:sub-tab-active={isActive(tab.href)}
      >{tab.label}</a>
    {/each}
  </div>
</nav>

{@render children()}

<style>
  .sub-nav {
    height: 32px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    padding: 0 16px;
    margin: -20px -24px 20px;
  }

  .sub-tab-list {
    display: flex;
    align-items: stretch;
    gap: 0;
  }

  .sub-tab {
    display: inline-flex;
    align-items: center;
    padding: 0 10px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-decoration: none;
    color: var(--color-muted);
    height: 32px;
    border-bottom: 1px solid transparent;
    transition: color 0.1s;
    white-space: nowrap;
    line-height: 1;
  }

  .sub-tab:hover {
    color: var(--color-text);
  }

  .sub-tab-active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .sub-tab-active:hover {
    color: var(--color-accent);
  }
</style>
