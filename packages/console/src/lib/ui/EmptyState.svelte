<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    icon = 'default',
    title,
    description = '',
    href = '',
    hrefLabel = '',
    children,
  }: {
    icon?: 'repos' | 'issues' | 'pulls' | 'agents' | 'skills' | 'prompts' | 'plans' | 'actions' | 'workflows' | 'files' | 'default';
    title: string;
    description?: string;
    href?: string;
    hrefLabel?: string;
    children?: Snippet;
  } = $props();
</script>

<div class="empty-state">
  <div class="icon-wrap">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      {#if icon === 'repos'}
        <path d="M4 4h16v16H4z" /><path d="M12 4v8" /><path d="M8 16l4-4 4 4" />
      {:else if icon === 'issues'}
        <circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
      {:else if icon === 'pulls'}
        <circle cx="8" cy="6" r="2" /><circle cx="16" cy="18" r="2" /><circle cx="8" cy="18" r="2" /><path d="M8 8v10" /><path d="M16 16V9a3 3 0 0 0-3-3h-1" />
      {:else if icon === 'agents'}
        <rect x="6" y="8" width="12" height="10" rx="2" /><path d="M12 8V5" /><circle cx="12" cy="4" r="1" /><circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" /><circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" /><path d="M10 16h4" />
      {:else if icon === 'skills'}
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      {:else if icon === 'prompts'}
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8" /><path d="M8 13h5" />
      {:else if icon === 'plans'}
        <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 9l2 2 4-4" /><path d="M8 15h8" /><path d="M8 19h5" />
      {:else if icon === 'actions'}
        <circle cx="12" cy="12" r="9" /><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
      {:else if icon === 'workflows'}
        <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      {:else if icon === 'files'}
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      {:else}
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      {/if}
    </svg>
  </div>

  <p class="title">{title}</p>

  {#if description}
    <p class="description">{description}</p>
  {/if}

  {#if href && hrefLabel}
    <a class="cta" {href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
      {hrefLabel} →
    </a>
  {/if}

  {#if children}
    <div class="extra">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .empty-state {
    max-width: 360px;
    margin: 0 auto;
    padding: 32px 24px;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
  }

  .icon-wrap {
    color: var(--color-dim);
    display: inline-flex;
  }

  .title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-muted);
    margin: 10px 0 0;
  }

  .description {
    font-size: 12px;
    color: var(--color-dim);
    margin: 4px 0 0;
    line-height: 1.5;
  }

  .cta {
    display: inline-block;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
    margin-top: 10px;
  }

  .cta:hover {
    text-decoration: underline;
  }

  .extra {
    margin-top: 10px;
  }
</style>
