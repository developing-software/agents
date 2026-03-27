<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

{#if data.installation}
  <div class="flex flex-1 items-center justify-center px-6 py-16">
    <div
      class="w-full max-w-md rounded-xl p-8 text-center"
      style="background: var(--color-surface); border: 1px solid var(--color-border);"
    >
      <p
        class="mb-3 text-xs font-semibold uppercase tracking-widest"
        style="color: var(--color-success);"
      >
        {data.installation.action === 'update' ? 'Installation updated' : 'App installed'}
      </p>
      <h1 class="mb-3 text-xl font-semibold" style="color: var(--color-text);">
        GitHub App connected
      </h1>
      <p class="mb-8 text-sm leading-relaxed" style="color: var(--color-muted);">
        The webhook is being processed. Your repository will appear in the console shortly.
      </p>
      <a
        href="/repos"
        class="inline-flex items-center rounded-md px-5 py-2 text-sm font-medium text-white transition-colors"
        style="background: var(--color-accent);"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = '#3a7de8')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-accent)')}
      >
        Go to console →
      </a>
    </div>
  </div>
{:else}
  <div class="bg-grid flex flex-1 flex-col items-center justify-center px-6 py-24">
    <h1
      class="mb-4 text-center text-5xl font-bold tracking-tight"
      style="background: linear-gradient(135deg, var(--color-text) 0%, var(--color-accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
    >
      agents
    </h1>
    <p class="mb-10 max-w-sm text-center text-sm leading-relaxed" style="color: var(--color-muted);">
      Monitor and manage your AI-driven GitHub workflows.
    </p>
    {#if data.userID}
      <p
        class="mb-6 rounded-md px-3 py-1.5 font-mono text-xs"
        style="color: var(--color-dim); background: var(--color-surface); border: 1px solid var(--color-border);"
      >
        {data.userID}
      </p>
      <a
        href="/repos"
        class="inline-flex items-center rounded-md px-6 py-2.5 text-sm font-medium text-white transition-colors"
        style="background: var(--color-accent);"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = '#3a7de8')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-accent)')}
      >
        Open Console →
      </a>
    {:else}
      <a
        href="/login"
        class="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium text-white transition-colors"
        style="background: var(--color-accent);"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = '#3a7de8')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-accent)')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        Sign in with GitHub
      </a>
    {/if}
  </div>
{/if}

<style>
  .bg-grid {
    background-image: linear-gradient(var(--color-border) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
    background-size: 40px 40px;
    background-position: center center;
  }
</style>
