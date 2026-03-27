<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const totalRepos = $derived(data.orgs.reduce((sum, { repos }) => sum + repos.length, 0));
</script>

<div class="mx-auto max-w-3xl px-6 py-10">
  <div class="mb-8 flex items-center gap-3">
    <h1 class="text-xl font-semibold text-text">Repositories</h1>
    {#if totalRepos > 0}
      <span
        class="rounded-full bg-elevated border border-border px-2.5 py-0.5 text-xs font-medium text-muted"
      >
        {totalRepos}
      </span>
    {/if}
  </div>

  {#if data.orgs.length === 0}
    <div
      class="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-12 text-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-dim"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <line x1="3" y1="12" x2="9" y2="12" />
        <line x1="15" y1="12" x2="21" y2="12" />
        <line x1="12" y1="3" x2="12" y2="9" />
        <line x1="12" y1="15" x2="12" y2="21" />
      </svg>
      <div>
        <p class="text-sm font-medium text-text">No repositories synced yet</p>
        <p class="mt-1 text-sm text-muted">Connect your GitHub account to get started.</p>
      </div>
      <a
        href="https://github.com/apps"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-1 rounded-md border border-border-bright bg-elevated px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-hover"
      >
        Install GitHub App
      </a>
    </div>
  {:else}
    <div class="space-y-8">
      {#each data.orgs as { org, repos } (org)}
        <section>
          <div class="mb-3 flex items-center gap-3">
            <a
              href="/gh/{org}"
              class="font-mono text-sm text-muted transition-colors hover:text-text"
            >
              <span class="text-dim">/ </span>{org}
            </a>
            <div class="h-px flex-1 bg-border"></div>
          </div>
          <ul
            class="overflow-hidden rounded-lg border border-border"
            style="background: var(--color-surface);"
          >
            {#each repos as repo (repo.repo)}
              <li class="border-b border-border last:border-b-0">
                <a
                  href="/gh/{repo.owner}/{repo.repo}"
                  class="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-hover"
                >
                  <span class="text-sm font-medium text-text">{repo.repo}</span>
                  <div class="flex items-center gap-3">
                    {#if repo.defaultBranch}
                      <span class="font-mono text-xs text-muted">{repo.defaultBranch}</span>
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
        </section>
      {/each}
    </div>
  {/if}
</div>
