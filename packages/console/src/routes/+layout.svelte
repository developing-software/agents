<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import type { LayoutProps } from './$types';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  const SIDEBAR_PINNED_STORAGE_KEY = 'console.sidebar.pinned';

  let { data, children }: LayoutProps = $props();
  let desktopSidebarPinned = $state(readDesktopSidebarPinnedPreference());
  let mobileDrawerOpen = $state(false);

  const currentRepoKey = $derived(
    page.params.organization && page.params.repo
      ? `${page.params.organization}/${page.params.repo}`
      : null
  );

  const showSidebar = $derived(
    !!data.userID && data.sidebarOrgs.length > 0
  );

  $effect(() => {
    if (!browser) {
      return;
    }

    try {
      window.localStorage.setItem(
        SIDEBAR_PINNED_STORAGE_KEY,
        desktopSidebarPinned ? 'true' : 'false'
      );
    } catch {
      // Ignore storage failures so navigation still works.
    }
  });

  function readDesktopSidebarPinnedPreference() {
    if (!browser) {
      return false;
    }

    try {
      return window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function toggleDesktopSidebarPinned() {
    desktopSidebarPinned = !desktopSidebarPinned;
  }

  function toggleMobileDrawer() {
    mobileDrawerOpen = !mobileDrawerOpen;
  }

  function closeMobileDrawer() {
    mobileDrawerOpen = false;
  }

  function handleWindowResize() {
    if (window.innerWidth >= 768) {
      mobileDrawerOpen = false;
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      mobileDrawerOpen = false;
    }
  }

  function getOrgInitials(org: string) {
    const segments = org.split(/[^A-Za-z0-9]+/).filter(Boolean);

    if (segments.length === 0) {
      return org.slice(0, 2).toUpperCase();
    }

    return segments
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2);
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onresize={handleWindowResize} onkeydown={handleWindowKeydown} />

<div class="app-shell">
  <header class="app-topbar">
    <div class="app-topbar-start">
      {#if showSidebar}
        <button
          type="button"
          class="app-sidebar-toggle"
          aria-controls="repo-sidebar"
          aria-expanded={mobileDrawerOpen}
          aria-label={mobileDrawerOpen ? 'Close repository navigation' : 'Open repository navigation'}
          onclick={toggleMobileDrawer}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 4.25h11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            <path d="M2.5 8h11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            <path d="M2.5 11.75h11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </button>
      {/if}

      <a href="/" class="app-topbar-brand">
        <img src={favicon} alt="agents logo" class="app-topbar-favicon" />
        <span class="app-topbar-name">agents</span>
      </a>
    </div>

    <div class="app-topbar-actions">
      <a href="/models" class="app-topbar-link">Models</a>
      {#if data.userID}
        <a href="/logout" class="app-signout-link">Sign out</a>
      {:else}
        <a href="/login" class="app-signin-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>
      {/if}
    </div>
  </header>

  <div class="app-body">
    {#if showSidebar}
      <button
        type="button"
        class={['app-sidebar-backdrop', mobileDrawerOpen && 'app-sidebar-backdrop-visible']}
        aria-label="Close repository navigation"
        aria-hidden={!mobileDrawerOpen}
        tabindex={mobileDrawerOpen ? 0 : -1}
        onclick={closeMobileDrawer}
      ></button>

      <nav
        id="repo-sidebar"
        class={[
          'app-sidebar',
          desktopSidebarPinned && 'app-sidebar-pinned',
          mobileDrawerOpen && 'app-sidebar-mobile-open'
        ]}
        aria-label="Repository navigation"
      >
        <div class="app-sidebar-scroll">
          {#each data.sidebarOrgs as { org, repos } (org)}
            <div class="app-org-group">
              <a href="/gh/{org}" class="app-org-header" onclick={closeMobileDrawer}>
                <span class="app-org-badge">{getOrgInitials(org)}</span>
                <span class="app-org-header-text">/ {org}</span>
              </a>
              <ul class="app-repo-list">
              {#each repos as repo (`${repo.owner}/${repo.repo}`)}
                {@const repoKey = `${repo.owner}/${repo.repo}`}
                {@const isActive = currentRepoKey === repoKey}
                <li>
                  <a
                    href="/gh/{repo.owner}/{repo.repo}"
                    class={['app-repo-link', isActive && 'app-repo-link-active']}
                    aria-current={isActive ? 'page' : undefined}
                    onclick={closeMobileDrawer}
                  >
                    <span
                      class={['app-repo-dot', isActive && 'app-repo-dot-active']}
                      aria-hidden="true"
                    ></span>
                    <span class="app-repo-link-text">{repo.repo}</span>
                  </a>
                </li>
              {/each}
              </ul>
            </div>
          {/each}
        </div>

        <button
          type="button"
          class="app-sidebar-pin-toggle"
          aria-pressed={desktopSidebarPinned}
          aria-label={desktopSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          onclick={toggleDesktopSidebarPinned}
        >
          <span class="app-sidebar-pin-icon" aria-hidden="true">
            {desktopSidebarPinned ? '<' : '>'}
          </span>
          <span class="app-sidebar-pin-label">
            {desktopSidebarPinned ? 'Unpin' : 'Pin'}
          </span>
        </button>
      </nav>
    {/if}

    <main class="app-content">
      {@render children()}
    </main>
  </div>
</div>
