<script lang="ts">
  import { page } from '$app/state';


  const breadcrumbs = $derived(page.data.breadcrumbs as Breadcrumb[] | undefined);
</script>

{#if breadcrumbs && breadcrumbs.length > 0}
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li>
        <a href="/" class="crumb-link">Home</a>
      </li>
      {#each breadcrumbs as crumb, i (i)}
        <li>
          <span class="sep" aria-hidden="true">/</span>
          {#if crumb.href && i < breadcrumbs.length - 1}
            <a href={crumb.href} class="crumb-link">{crumb.label}</a>
          {:else}
            <span class="crumb-current" aria-current="page">{crumb.label}</span>
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
    min-width: 0;
    overflow: hidden;
  }

  ol {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0;
    min-width: 0;
    flex-wrap: nowrap;
  }

  li {
    display: flex;
    align-items: center;
    gap: 0;
    min-width: 0;
    flex-shrink: 0;
  }

  /* Allow last item to truncate */
  li:last-child {
    flex-shrink: 1;
    min-width: 0;
  }

  .sep {
    color: var(--color-dim);
    font-size: 11px;
    margin: 0 5px;
    flex-shrink: 0;
  }

  .crumb-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.1s;
  }

  .crumb-link:hover {
    color: var(--color-muted);
  }

  .crumb-current {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  @media (max-width: 600px) {
    .crumb-current {
      max-width: 120px;
    }
  }
</style>
