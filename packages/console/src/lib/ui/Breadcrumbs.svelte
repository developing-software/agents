<script lang="ts">
  interface Breadcrumb {
    label: string;
    href?: string;
  }

  let { items }: { items: Breadcrumb[] } = $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  {#each items as item, i (i)}
    {#if i > 0}
      <span class="sep" aria-hidden="true">/</span>
    {/if}
    {#if item.href && i < items.length - 1}
      <a href={item.href} class="crumb">{item.label}</a>
    {:else}
      <span class="crumb crumb-current" aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
    {/if}
  {/each}
</nav>

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    min-width: 0;
    flex: 1;
  }

  .sep {
    color: var(--color-dim);
    font-size: 11px;
    flex-shrink: 0;
    user-select: none;
  }

  .crumb {
    font-size: 12px;
    color: var(--color-muted);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex-shrink: 1;
    transition: color 0.1s;
  }

  a.crumb:hover {
    color: var(--color-text);
  }

  .crumb-current {
    color: var(--color-text);
    flex-shrink: 0;
  }
</style>
