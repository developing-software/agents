<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<div class="mx-auto max-w-3xl px-6 py-10">
  <nav class="mb-6 flex items-center gap-1.5 font-mono text-sm text-muted" aria-label="Breadcrumb">
    <a href="/repos" class="transition-colors hover:text-text">repos</a>
    <span class="text-dim">/</span>
    <span class="text-text">{data.organization}</span>
  </nav>

  <h1 class="mb-8 text-2xl font-semibold text-text">{data.organization}</h1>

  {#if data.repos.length === 0}
    <div
      class="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-12 text-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-dim"
        aria-hidden="true"
      >
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
      <div>
        <p class="text-sm font-medium text-text">No repositories found</p>
        <p class="mt-1 text-sm text-muted">
          No repositories are synced for <span class="font-mono text-text">{data.organization}</span>.
        </p>
      </div>
    </div>
  {:else}
    <ul
      class="overflow-hidden rounded-lg border border-border"
      style="background: var(--color-surface);"
    >
      {#each data.repos as repo (repo.repo)}
        <li class="border-b border-border last:border-b-0">
          <a
            href="/gh/{repo.owner}/{repo.repo}"
            class="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-hover"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-text">{repo.repo}</p>
              <p class="mt-0.5 font-mono text-xs text-dim">{repo.fullName}</p>
            </div>
            <div class="ml-4 flex shrink-0 items-center gap-3">
              {#if repo.defaultBranch}
                <span
                  class="rounded border border-border bg-elevated px-2 py-0.5 font-mono text-xs text-muted"
                >
                  {repo.defaultBranch}
                </span>
              {/if}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-dim transition-colors group-hover:text-muted"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
