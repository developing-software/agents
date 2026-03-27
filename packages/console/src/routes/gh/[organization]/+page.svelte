<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<div class="page">
  <p class="breadcrumb">repositories / <span class="org">{data.organization}</span></p>

  {#if data.repos.length === 0}
    <p class="empty">No repositories found for <span class="org">{data.organization}</span>.</p>
  {:else}
    <div class="repos-grid">
      {#each data.repos as repo (repo.repo)}
        <a href="/gh/{repo.owner}/{repo.repo}" class="repo-card">
          <span class="repo-name">{repo.repo}</span>
          {#if repo.defaultBranch}
            <span class="repo-branch">⎇ {repo.defaultBranch}</span>
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

  .empty {
    font-size: 12px;
    color: var(--color-dim);
    margin: 0;
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
    border-radius: 3px;
    text-decoration: none;
    transition: background 0.1s, border-color 0.1s;
  }

  .repo-card:hover {
    background: var(--color-elevated);
    border-color: var(--color-border-bright);
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
