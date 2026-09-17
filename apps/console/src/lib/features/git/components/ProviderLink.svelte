<script lang="ts">
  import type { ProviderType } from '@agents/core/git';

  interface Props {
    href: string;
    provider?: ProviderType;
    class?: string;
  }

  let { href, provider = 'github', class: className = '' }: Props = $props();
</script>

<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  class="provider-link {className}"
  aria-label="View on {provider}"
>
  {#if provider === 'github'}
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  {:else if provider === 'gitlab'}
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 14.5L10.9 5.3H5.1L8 14.5z" />
      <path d="M8 14.5L5.1 5.3H1.2L8 14.5z" opacity="0.7" />
      <path d="M1.2 5.3L0.1 8.6c-0.1 0.3 0 0.6 0.3 0.8L8 14.5 1.2 5.3z" opacity="0.5" />
      <path d="M1.2 5.3H5.1L3.4 0.3C3.3 0.1 3 0.1 2.9 0.3L1.2 5.3z" />
      <path d="M8 14.5L10.9 5.3H14.8L8 14.5z" opacity="0.7" />
      <path d="M14.8 5.3L15.9 8.6c0.1 0.3 0 0.6-0.3 0.8L8 14.5 14.8 5.3z" opacity="0.5" />
      <path d="M14.8 5.3H10.9L12.6 0.3C12.7 0.1 13 0.1 13.1 0.3L14.8 5.3z" />
    </svg>
  {:else}
    <!-- Generic external link icon for bitbucket/gitea/others -->
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3" />
      <path d="M9 1h6v6" />
      <path d="M15 1L7 9" />
    </svg>
  {/if}
</a>

<style>
  .provider-link {
    display: inline-flex;
    align-items: center;
    color: var(--color-dim);
    transition: color 0.1s;
    line-height: 1;
  }

  .provider-link:hover {
    color: var(--color-muted);
  }
</style>
