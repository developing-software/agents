<script lang="ts">
  type BreadcrumbsProps = {
    items: Array<{ label: string; href?: string }>;
  };

  let { items }: BreadcrumbsProps = $props();
</script>

{#if items.length > 0}
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      {#each items as item, i (i)}
        <li class="breadcrumb-item">
          {#if i < items.length - 1 && item.href}
            <a href={item.href} class="breadcrumb-link">{item.label}</a>
            <span class="breadcrumb-separator" aria-hidden="true">/</span>
          {:else}
            <span class="breadcrumb-current" aria-current="page">{item.label}</span>
          {/if}
        </li>
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .breadcrumbs {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .breadcrumb-list {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 4px;
    overflow: hidden;
  }

  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  .breadcrumb-link {
    font-size: 12px;
    color: var(--color-muted);
    text-decoration: none;
    padding: 2px 4px;
    border-radius: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.1s, background 0.1s;
  }

  .breadcrumb-link:hover {
    color: var(--color-text);
    background: var(--color-hover);
  }

  .breadcrumb-separator {
    font-size: 12px;
    color: var(--color-dim);
    user-select: none;
  }

  .breadcrumb-current {
    font-size: 12px;
    color: var(--color-text);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 4px;
  }

  /* Mobile: collapse breadcrumbs */
  @media (max-width: 767px) {
    .breadcrumb-item:not(:last-child):not(:nth-last-child(2)) {
      display: none;
    }
  }
</style>
