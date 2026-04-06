<script lang="ts">
  import type { LayoutProps } from './$types';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { page } from '$app/state';

  let { data, children }: LayoutProps = $props();

  const currentRepoKey = $derived(
    page.params.organization && page.params.repo
      ? `${page.params.organization}/${page.params.repo}`
      : null
  );

  const showSidebar = $derived(
    !!data.userID && data.sidebarOrgs.length > 0
  );
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="shell">
  <header class="topbar">
    <a href="/" class="topbar-brand">
      <img src={favicon} alt="agents logo" class="topbar-favicon" />
      <span class="topbar-name">agents</span>
    </a>

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
      <nav class="sidebar" aria-label="Repository navigation">
        {#each data.sidebarOrgs as { org, repos } (org)}
          <div class="org-group">
            <a href="/gh/{org}" class="org-header">/ {org}</a>
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
                  >
                    {repo.repo}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
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

  .topbar-brand {
    display: flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    color: var(--color-text);
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
    width: 220px;
    flex-shrink: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    height: calc(100vh - 36px);
    overflow-y: auto;
    padding-top: 8px;
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
  }

  .org-header:hover {
    color: var(--color-muted);
  }

  .repo-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .repo-link {
    display: block;
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

  .repo-link-active {
    background: var(--color-elevated);
    border-left: 2px solid var(--color-accent);
    color: var(--color-text);
    padding-left: 18px;
  }

  .repo-link-active:hover {
    background: var(--color-elevated);
  }

  /* Main content */
  .content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
</style>
