<script lang="ts">
  import type { LayoutProps } from './$types';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/state';
  import { PersistedState } from 'runed';

  let { data, children }: LayoutProps = $props();
  const sidebarPinned = new PersistedState('sidebar-pinned', false);
  let hovered = $state(false);
  let drawerOpen = $state(false);

  const currentRepoKey = $derived(
    page.params.organization && page.params.repo
      ? `${page.params.organization}/${page.params.repo}`
      : null
  );
  const sidebarExpanded = $derived(sidebarPinned.current || hovered);

  const showSidebar = $derived(
    !!data.userID && data.sidebarOrgs.length > 0
  );

  function orgInitials(org: string): string {
    const cleaned = org.replace(/[^a-z0-9]/gi, ' ').trim();
    if (!cleaned) return '?';

    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }

    return cleaned.slice(0, 2).toUpperCase();
  }

  function togglePinned() {
    sidebarPinned.current = !sidebarPinned.current;
  }

  function closeDrawer() {
    drawerOpen = false;
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
  <header class="topbar">
    <div class="topbar-left">
      {#if showSidebar}
        <button
          type="button"
          class="hamburger"
          aria-label={drawerOpen ? 'Close repository menu' : 'Open repository menu'}
          aria-expanded={drawerOpen}
          aria-controls="repo-sidebar"
          onclick={() => {
            drawerOpen = !drawerOpen;
          }}
        >
          ☰
        </button>
      {/if}
      <a href="/" class="topbar-brand">
        <img src={favicon} alt="agents logo" class="topbar-favicon" />
        <span class="topbar-name">agents</span>
      </a>
    </div>

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
      <nav
        id="repo-sidebar"
        class="sidebar"
        class:expanded={sidebarExpanded}
        class:drawer-open={drawerOpen}
        aria-label="Repository navigation"
        onmouseenter={() => {
          hovered = true;
        }}
        onmouseleave={() => {
          hovered = false;
        }}
      >
        {#each data.sidebarOrgs as { org, repos } (org)}
          <div class="org-group">
            <a href="/gh/{org}" class="org-header" onclick={closeDrawer}>
              <span class="org-initial" aria-hidden="true">{orgInitials(org)}</span>
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
                    onclick={closeDrawer}
                  >
                    <span class="repo-dot" aria-hidden="true"></span>
                    <span class="repo-link-text">{repo.repo}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}

        <button type="button" class="sidebar-pin" onclick={togglePinned} aria-label="Toggle pinned sidebar">
          {sidebarPinned.current ? '‹' : '›'}
        </button>
      </nav>
      <button
        type="button"
        class="backdrop"
        class:open={drawerOpen}
        aria-label="Close repository drawer"
        tabindex={drawerOpen ? 0 : -1}
        onclick={closeDrawer}
      ></button>
    {/if}

    <main class="content">
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
  }

  .topbar-left {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  .topbar-brand {
    display: flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    color: var(--color-text);
  }

  .hamburger {
    display: none;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 6px;
    border: 1px solid var(--color-border-bright);
    border-radius: 4px;
    color: var(--color-muted);
    background: transparent;
    line-height: 1;
    font-size: 14px;
    cursor: pointer;
  }

  .hamburger:hover {
    color: var(--color-text);
    background: var(--color-hover);
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

  /* Sidebar */
  .sidebar {
    width: var(--sidebar-collapsed-width);
    flex-shrink: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: calc(100vh - 36px);
    overflow-x: hidden;
    overflow-y: auto;
    padding-top: 8px;
    transition: width var(--sidebar-rail-transition);
  }

  .sidebar.expanded {
    width: var(--sidebar-expanded-width);
  }

  .org-group {
    margin-bottom: 4px;
  }

  .org-header {
    display: block;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    color: var(--color-dim);
    padding: 4px 8px;
    text-decoration: none;
    letter-spacing: 0.04em;
    min-height: 22px;
  }

  .org-header:hover {
    color: var(--color-muted);
  }

  .org-initial {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid var(--color-border-bright);
    color: var(--color-muted);
    align-items: center;
    justify-content: center;
    font-size: 10px;
    margin: 0 auto;
    display: none;
  }

  .org-header-text {
    display: inline;
    opacity: 1;
    transition: opacity 0.12s;
    white-space: nowrap;
  }

  .repo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .repo-link {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-family: system-ui, sans-serif;
    color: var(--color-muted);
    text-decoration: none;
    padding: 4px 12px 4px 20px;
    transition: background 0.08s, color 0.08s;
  }

  .repo-link:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .repo-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--color-border-bright);
    flex-shrink: 0;
  }

  .repo-link-text {
    opacity: 1;
    transition: opacity 0.12s;
    white-space: nowrap;
  }

  .repo-link-active {
    background: var(--color-elevated);
    border-left: 2px solid var(--color-accent);
    color: var(--color-text);
    padding-left: 18px;
  }

  .repo-link-active:hover {
    background: var(--color-elevated);
  }

  .repo-link-active .repo-dot {
    background: var(--color-accent);
  }

  .sidebar-pin {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--sidebar-collapsed-width) - 8px);
    height: 20px;
    margin: 12px auto 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    transition: color 0.12s, background 0.12s, width var(--sidebar-rail-transition);
  }

  .sidebar.expanded .sidebar-pin {
    width: calc(var(--sidebar-expanded-width) - 16px);
  }

  .sidebar-pin:hover {
    color: var(--color-text);
    background: var(--color-hover);
  }

  .sidebar:not(.expanded) .org-header {
    padding-inline: 4px;
  }

  .sidebar:not(.expanded) .org-header-text,
  .sidebar:not(.expanded) .repo-link-text {
    opacity: 0;
    pointer-events: none;
    width: 0;
  }

  .sidebar:not(.expanded) .org-initial {
    display: flex;
  }

  .sidebar:not(.expanded) .repo-link {
    justify-content: center;
    padding: 6px 0;
  }

  .sidebar:not(.expanded) .repo-link-active {
    padding-left: 0;
    border-left: none;
  }

  .backdrop {
    position: fixed;
    inset: 36px 0 0;
    border: 0;
    margin: 0;
    background: rgb(0 0 0 / 48%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease;
    z-index: 40;
    display: none;
  }

  .backdrop.open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Main content */
  .content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }

  @media (max-width: 767px) {
    .hamburger {
      display: flex;
    }

    .sidebar {
      position: fixed;
      top: 36px;
      left: 0;
      width: var(--sidebar-expanded-width);
      height: calc(100vh - 36px);
      z-index: 50;
      transform: translateX(-100%);
      transition: transform var(--sidebar-drawer-transition);
      border-right: 1px solid var(--color-border);
      box-shadow: none;
      padding-top: 8px;
    }

    .sidebar.drawer-open {
      transform: translateX(0);
    }

    .sidebar .org-header {
      padding: 4px 8px;
    }

    .sidebar .repo-link {
      justify-content: flex-start;
      padding: 4px 12px 4px 20px;
    }

    .sidebar .repo-link-active {
      border-left: 2px solid var(--color-accent);
      padding-left: 18px;
    }

    .sidebar .org-initial {
      display: none;
    }

    .sidebar .org-header-text,
    .sidebar .repo-link-text {
      opacity: 1;
      pointer-events: auto;
      width: auto;
    }

    .sidebar-pin {
      display: none;
    }

    .backdrop {
      display: block;
    }
  }
</style>
