<script lang="ts">
  import type { LayoutProps } from './$types';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col" style="background: var(--color-bg);">
  <nav
    class="flex items-center justify-between px-5"
    style="height: 44px; background: var(--color-surface); border-bottom: 1px solid var(--color-border);"
  >
    <a href="/" class="flex items-center gap-2 text-sm font-semibold text-white no-underline">
      <span class="favicon-glow">
        <img src={favicon} alt="logo" class="h-5 w-5 block" />
      </span>
      <span>agents</span>
    </a>

    <div class="flex items-center gap-2">
      {#if data.userID}
        <a
          href="/logout"
          class="px-3 py-1.5 text-xs transition-colors"
          style="color: var(--color-muted);"
          onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-text)')}
          onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')}
        >
          Sign out
        </a>
      {:else}
        <a
          href="/login"
          class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style="background: var(--color-surface); border: 1px solid var(--color-border-bright); color: var(--color-text);"
          onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
          onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-surface)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub
        </a>
      {/if}
    </div>
  </nav>

  {@render children()}
</div>

<style>
  .favicon-glow img {
    filter: drop-shadow(0 0 6px var(--color-accent));
  }
</style>
