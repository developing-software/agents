<script lang="ts">
  import type { PageProps } from './$types';
  import EmptyState from '$lib/EmptyState.svelte';

  let { data }: PageProps = $props();
</script>

<div class="px-6 py-8">
  <h1 class="mb-6 font-medium" style="font-size: 16px; color: var(--color-text);">
    Repositories
  </h1>

  {#if data.orgs.length === 0}
    <EmptyState
      icon="repos"
      title="No repositories found"
      description="Install the GitHub App to connect your repos."
      href="https://github.com/apps"
      hrefLabel="Install GitHub App"
    />
  {:else}
    <div class="flex flex-col gap-8">
      {#each data.orgs as { org, repos } (org)}
        <section>
          <div class="mb-3 flex items-center gap-3">
            <span
              class="shrink-0"
              style="font-family: var(--font-mono); font-size: 12px; color: var(--color-dim);"
            >/ {org}</span>
            <hr
              style="flex: 1; border: none; border-top: 1px solid var(--color-border); margin: 0;"
            />
          </div>

          <div class="repos-grid">
            {#each repos as repo (repo.repo)}
              <a
                href="/gh/{repo.owner}/{repo.repo}"
                class="repo-card"
              >
                <span class="repo-name">{repo.repo}</span>
                {#if repo.defaultBranch}
                  <span class="repo-branch">⎇ {repo.defaultBranch}</span>
                {/if}
              </a>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</div>

<style>
  .repos-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  @media (max-width: 900px) {
    .repos-grid {
      grid-template-columns: repeat(2, 1fr);
    }
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
    content: '›';
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
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-dim);
  }
</style>
