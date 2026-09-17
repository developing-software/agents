<script lang="ts">
  import type { LayoutProps } from './$types';
  import { page } from '$app/state';

  let { data, children }: LayoutProps = $props();

  const basePath = $derived(`/${data.provider}/${data.organization}/${data.repoName}/agents`);

  const tabs = $derived([
    { label: 'Runs', href: basePath },
    { label: 'Plans', href: `${basePath}/plans` },
    { label: 'Config', href: `${basePath}/config` },
    { label: 'Skills', href: `${basePath}/skills` },
    { label: 'Prompts', href: `${basePath}/prompts` },
    { label: 'Audits', href: `${basePath}/audits` },
  ]);

  function isActive(href: string) {
    if (href === basePath) {
      return page.url.pathname === basePath;
    }
    return page.url.pathname.startsWith(href);
  }

  const activeTab = $derived(tabs.find((t) => isActive(t.href)) ?? tabs[0]);
</script>

<nav class="sub-nav" aria-label="Agent sections">
  <div class="sub-tab-list">
    {#each tabs as tab (tab.href)}
      <a
        href={tab.href}
        class="sub-tab"
        class:sub-tab-active={isActive(tab.href)}
      >{tab.label}</a>
    {/each}
  </div>

  <label class="sub-select-wrap">
    <span class="visually-hidden">Agent section</span>
    <select
      class="sub-select"
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
</nav>

{@render children()}

<style>
  .sub-nav {
    min-height: 32px;
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
    overflow-x: auto;
    scrollbar-width: none;
  }

  .sub-tab-list::-webkit-scrollbar {
    display: none;
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

  .sub-select-wrap {
    display: none;
    align-items: center;
    flex: 1;
    min-width: 0;
    padding: 4px 0;
  }

  .sub-select {
    width: 100%;
    height: 28px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 0 8px;
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

  @media (max-width: 600px) {
    .sub-nav {
      margin: -12px -14px 12px;
      padding: 0 12px;
    }

    .sub-tab-list {
      display: none;
    }

    .sub-select-wrap {
      display: flex;
    }
  }
</style>
