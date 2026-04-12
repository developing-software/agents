<script lang="ts">
  import type { LayoutProps } from './$types';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { navigating, page } from '$app/state';
  import { PersistedState } from 'runed';
  import PreLoadingIndicator from './PreLoadingIndicator.svelte';
  import Breadcrumbs from '$lib/ui/Breadcrumbs.svelte';

  let { data, children }: LayoutProps = $props();

  const currentRepoKey = $derived(
    page.params.organization && page.params.repo
      ? `${page.params.organization}/${page.params.repo}`
      : null
  );

  const showSidebar = $derived(!!data.userID && data.sidebarOrgs.length > 0);

  const sidebarPinned = new PersistedState('sidebar-pinned', false);
  let hovered = $state(false);
  let drawerOpen = $state(false);

  const expanded = $derived(sidebarPinned.current || hovered);

  function orgInitials(org: string) {
    return org.slice(0, 2).toUpperCase();
  }

  function repoInitials(repo: string) {
    return repo.slice(0, 2).toUpperCase();
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
  <header class="topbar">
    {#if showSidebar}
      <button
        class="hamburger"
        onclick={() => (drawerOpen = !drawerOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <rect y="1" width="14" height="1.5" rx="0.75" />
          <rect y="6.25" width="14" height="1.5" rx="0.75" />
          <rect y="11.5" width="14" height="1.5" rx="0.75" />
        </svg>
      </button>
    {/if}

    <a href="/" class="topbar-brand">
      <img src={favicon} alt="agents logo" class="topbar-favicon" />
      <span class="topbar-name">agents</span>
    </a>

    <Breadcrumbs items={data.breadcrumbs ?? []} />

    <div class="topbar-actions">
      <a href="/models" class="topbar-link">Models</a>
      {#if data.userID}
        <a href="/logout" class="signout-link">Sign out</a>
      {:else}
        <a href="/login" class="signin-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>
      {/if}
    </div>
  </header>

  <div class="body">
    {#if showSidebar}
      <!-- Backdrop: mobile overlay -->
      <div
        class="backdrop"
        class:backdrop-open={drawerOpen}
        onclick={() => (drawerOpen = false)}
        aria-hidden="true"
      ></div>

      <nav
        class="sidebar"
        class:expanded
        class:drawer-open={drawerOpen}
        onmouseenter={() => (hovered = true)}
        onmouseleave={() => (hovered = false)}
        aria-label="Repository navigation"
      >
        <div class="sidebar-content">
          {#each data.sidebarOrgs as { org, repos } (org)}
            <div class="org-group">
              <a href="/gh/{org}" class="org-header" title={org}>
                <span class="org-initial">{orgInitials(org)}</span>
                <span class="org-header-text">/ {org}</span>
              </a>
              <ul class="repo-list">
                {#each repos as repo (`${repo.owner}/${repo.repo}`)}
                  {@const repoKey = `${repo.owner}/${repo.repo}`}
                  {@const isActive = currentRepoKey === repoKey}
                  <li>
                    <a
                      href="/gh/{repo.owner}/{repo.repo}"
                      class="repo-link"
                      class:repo-link-active={isActive}
                      aria-current={isActive ? 'page' : undefined}
                      onclick={() => (drawerOpen = false)}
                    >
                      <span class="repo-initial" class:repo-initial-active={isActive}>{repoInitials(repo.repo)}</span>
                      <span class="repo-link-text">{repo.repo}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>

        <!-- Pin toggle: desktop only -->
        <button
          class="pin-toggle"
          onclick={() => (sidebarPinned.current = !sidebarPinned.current)}
          aria-label={sidebarPinned.current ? 'Unpin sidebar' : 'Pin sidebar open'}
          title={sidebarPinned.current ? 'Unpin sidebar' : 'Pin sidebar open'}
        >
          {sidebarPinned.current ? '‹' : '›'}
        </button>
      </nav>
    {/if}

    <main class="content">
      {#if navigating.complete}
        <PreLoadingIndicator />
      {/if}
      {@render children()}
    </main>
  </div>
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-bg);
  }

  /* Top bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    flex-shrink: 0;
    padding: 0 10px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    gap: 8px;
  }

  .hamburger {
    display: none;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: 3px;
    transition: color 0.1s, background 0.1s;
  }

  .hamburger:hover {
    color: var(--color-text);
    background: var(--color-hover);
  }

  .topbar-brand {
    display: flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    color: var(--color-text);
    flex: 1;
  }

  .topbar-favicon {
    width: 16px;
    height: 16px;
    display: block;
  }

  .topbar-name {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  .topbar-actions {
    display: flex;
    align-items: center;
  }

  .topbar-link {
    font-size: 12px;
    color: var(--color-muted);
    text-decoration: none;
    padding: 4px 6px;
    margin-right: 4px;
    transition: color 0.1s;
  }

  .topbar-link:hover {
    color: var(--color-text);
  }

  .signout-link {
    font-size: 12px;
    color: var(--color-muted);
    text-decoration: none;
    padding: 4px 6px;
    transition: color 0.1s;
  }

  .signout-link:hover {
    color: var(--color-text);
  }

  .signin-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--color-text);
    text-decoration: none;
    padding: 3px 8px;
    border: 1px solid var(--color-border-bright);
    border-radius: 4px;
    background: var(--color-surface);
    transition: background 0.1s;
  }

  .signin-btn:hover {
    background: var(--color-hover);
  }

  /* Body: sidebar + content */
  .body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  /* Backdrop (mobile overlay) */
  .backdrop {
    display: none;
    position: fixed;
    inset: 36px 0 0 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    opacity: 0;
    transition: opacity 200ms ease;
    pointer-events: none;
  }

  .backdrop.backdrop-open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Sidebar */
  .sidebar {
    width: 48px;
    flex-shrink: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: calc(100vh - 36px);
    overflow-x: hidden;
    overflow-y: auto;
    padding-top: 8px;
    transition: width 180ms ease;
    display: flex;
    flex-direction: column;
  }

  .sidebar.expanded {
    width: 220px;
  }

  .sidebar-content {
    flex: 1;
  }

  /* Org group */
  .org-group {
    margin-bottom: 4px;
  }

  .org-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    text-decoration: none;
    padding: 5px 8px;
    overflow: hidden;
    white-space: nowrap;
  }

  /* Org initial badge (collapsed state) */
  .org-initial {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-muted);
    letter-spacing: 0.04em;
    transition: opacity 120ms ease;
  }

  .org-header-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    color: var(--color-dim);
    letter-spacing: 0.04em;
    transition: opacity 120ms ease;
    white-space: nowrap;
  }

  .org-header:hover .org-header-text {
    color: var(--color-muted);
  }

  /* Hide/show based on expanded state */
  .sidebar:not(.expanded) .org-initial {
    opacity: 1;
  }

  .sidebar:not(.expanded) .org-header-text {
    opacity: 0;
    pointer-events: none;
    width: 0;
    overflow: hidden;
  }

  .sidebar.expanded .org-initial {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }

  .sidebar.expanded .org-header-text {
    opacity: 1;
  }

  /* Repo list */
  .repo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .repo-link {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    font-size: 13px;
    font-family: system-ui, sans-serif;
    color: var(--color-muted);
    text-decoration: none;
    padding: 4px 10px;
    overflow: hidden;
    white-space: nowrap;
    transition: background 0.08s, color 0.08s;
  }

  .repo-link:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .repo-link-active {
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .repo-link-active:hover {
    background: var(--color-elevated);
  }

  /* Repo initial (collapsed indicator) */
  .repo-initial {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    color: var(--color-muted);
    letter-spacing: 0.04em;
    transition: background 0.1s, opacity 120ms ease, border-color 0.1s;
  }

  .repo-initial-active {
    background: var(--color-elevated);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .repo-link:hover .repo-initial {
    background: var(--color-hover);
  }

  .repo-link-text {
    transition: opacity 120ms ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Collapsed: show initial, hide text */
  .sidebar:not(.expanded) .repo-initial {
    opacity: 1;
  }

  .sidebar:not(.expanded) .repo-link-text {
    opacity: 0;
    pointer-events: none;
    width: 0;
    overflow: hidden;
  }

  /* Expanded: hide initial, show text */
  .sidebar.expanded .repo-initial {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }

  .sidebar.expanded .repo-link-text {
    opacity: 1;
  }

  /* Expanded: active repo gets accent border */
  .sidebar.expanded .repo-link-active {
    border-left: 2px solid var(--color-accent);
    padding-left: 8px;
  }

  /* Pin toggle button (desktop only) */
  .pin-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 6px 0;
    background: none;
    border: none;
    border-top: 1px solid var(--color-border);
    color: var(--color-dim);
    font-size: 14px;
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
    flex-shrink: 0;
    margin-top: auto;
  }

  .pin-toggle:hover {
    color: var(--color-muted);
    background: var(--color-hover);
  }

  /* Main content */
  .content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    position: relative;
  }

  /* Mobile: overlay drawer */
  @media (max-width: 767px) {
    .hamburger {
      display: flex;
    }

    .backdrop {
      display: block;
    }

    .sidebar {
      position: fixed;
      top: 36px;
      left: 0;
      height: calc(100vh - 36px);
      width: 220px;
      transform: translateX(-100%);
      transition: transform 200ms ease;
      z-index: 50;
    }

    /* On mobile: always show expanded layout, no pin toggle */
    .sidebar .org-initial,
    .sidebar .repo-initial {
      display: none;
    }

    .sidebar .org-header-text,
    .sidebar .repo-link-text {
      opacity: 1 !important;
      width: auto !important;
      overflow: visible !important;
      pointer-events: auto !important;
    }

    .sidebar .repo-link {
      padding: 4px 12px 4px 20px;
    }

    .sidebar .repo-link-active {
      border-left: 2px solid var(--color-accent);
      padding-left: 18px;
    }

    .sidebar.drawer-open {
      transform: translateX(0);
    }

    .pin-toggle {
      display: none;
    }
  }
</style>
