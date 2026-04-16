<script lang="ts">
  import type { PageProps } from './$types';
  import EmptyState from '$lib/ui/EmptyState.svelte';

  let { data }: PageProps = $props();
</script>

<div class="page">
  <p class="breadcrumb">repositories / <span class="org">{data.organization}</span></p>

  {#if data.repos.length === 0}
    <EmptyState
      icon="repos"
      title="No repositories"
      description="No repositories found for {data.organization}."
    />
  {:else}
    <div class="repos-grid">
      {#each data.repos as repo (repo.repo)}
        <a href="/{data.provider}/{repo.owner}/{repo.repo}" class="repo-card">
          <span class="repo-name">{repo.repo}</span>
          {#if repo.defaultBranch}
            <span class="repo-branch">{repo.defaultBranch}</span>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 14px 16px;
  }

  .breadcrumb {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
    margin: 0 0 12px 0;
  }

  .org {
    color: var(--color-muted);
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
