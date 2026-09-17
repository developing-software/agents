<script lang="ts">
  import type { PageProps } from './$types';
  import EmptyState from '$lib/ui/EmptyState.svelte';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Repositories</title>
</svelte:head>

<div class="page">
  <h1 class="heading">Repositories</h1>

  {#if data.orgs.length === 0}
    <EmptyState
      icon="repos"
      title="No repositories"
      description="No repositories connected for {data.provider}."
    />
  {:else}
    {#each data.orgs as { org, repos } (org)}
      <div class="org-group">
        <a href="/w/{data.workspaceID}/{data.provider}/{org}" class="org-header">{org}</a>
        <div class="repos-grid">
          {#each repos as repo (repo.repo)}
            <a href="/{data.provider}/{repo.owner}/{repo.repo}" class="repo-card">
              <span class="repo-name">{repo.repo}</span>
              {#if repo.defaultBranch}
                <span class="repo-branch">{repo.defaultBranch}</span>
              {/if}
            </a>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .page {
    padding: 14px 16px;
  }

  .heading {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 16px 0;
  }

  .org-group {
    margin-bottom: 16px;
  }

  .org-header {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
    text-decoration: none;
    display: block;
    margin-bottom: 6px;
  }

  .org-header:hover {
    color: var(--color-text);
  }

  .repos-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  @media (max-width: 560px) {
    .repos-grid {
      grid-template-columns: 1fr;
    }
  }

  .repo-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left: 2px solid transparent;
    border-radius: 3px;
    text-decoration: none;
    position: relative;
    transition: background 0.1s, border-color 0.1s;
  }

  .repo-card:hover {
    background: var(--color-elevated);
    border-color: var(--color-border-bright);
    border-left-color: var(--color-accent);
  }

  .repo-card::after {
    content: '\203A';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    color: var(--color-dim);
    opacity: 0;
    transition: opacity 0.1s;
  }

  .repo-card:hover::after {
    opacity: 1;
  }

  .repo-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
  }

  .repo-branch {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }
</style>
