<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const baseTree = $derived(
    `/${data.provider}/${data.organization}/${data.repoName}/tree/${data.ref}`,
  );

  const parentHref = $derived(
    data.breadcrumbs.length > 1
      ? `${baseTree}/${data.breadcrumbs
          .slice(0, -1)
          .map((c) => c.label)
          .join('/')}`
      : baseTree,
  );

  function fileIcon(type: string, name: string): string {
    if (type === 'dir') return 'dir';
    const ext = name.split('.').pop()?.toLowerCase();
    const categories: Record<string, string> = {
      ts: 'ts', tsx: 'tsx', js: 'js', jsx: 'jsx',
      svelte: 'svelte', vue: 'vue', py: 'py', go: 'go',
      rs: 'rs', md: 'md', json: 'json', yaml: 'yaml', yml: 'yml',
      toml: 'toml', css: 'css', html: 'html', sh: 'sh',
    };
    return categories[ext ?? ''] ?? ext ?? 'file';
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function iconColor(type: string, name: string): string {
    if (type === 'dir') return 'var(--color-accent)';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'ts' || ext === 'tsx') return 'var(--color-accent)';
    if (ext === 'svelte') return 'var(--color-warning)';
    if (ext === 'js' || ext === 'jsx') return 'var(--color-warning)';
    if (ext === 'go') return 'var(--color-accent)';
    if (ext === 'rs') return 'var(--color-warning)';
    if (ext === 'py') return 'var(--color-accent)';
    return 'var(--color-dim)';
  }

  function entryHref(entry: { type: string; path: string }): string {
    if (entry.type === 'dir') return `${baseTree}/${entry.path}`;
    return `/${data.provider}/${data.organization}/${data.repoName}/blob/${data.ref}/${entry.path}`;
  }
</script>

<svelte:head>
  <title>{data.path} — {data.organization}/{data.repoName}</title>
</svelte:head>

<nav class="breadcrumb" aria-label="File path">
  <a href={baseTree} class="crumb">root</a>
  {#each data.breadcrumbs as crumb (crumb.href)}
    <span class="sep">/</span>
    <a href={crumb.href} class="crumb">{crumb.label}</a>
  {/each}
</nav>

{#if data.entries.length === 0 && !data.path}
  <p class="empty">Empty directory</p>
{:else}
  <div class="listing">
    {#if data.path}
      <a href={parentHref} class="row parent">
        <span class="type-label" aria-hidden="true">&nbsp;</span>
        <span class="name dim">..</span>
      </a>
    {/if}

    {#if data.entries.length === 0}
      <p class="empty">Empty directory</p>
    {:else}
      {#each data.entries as entry (entry.path)}
        <a href={entryHref(entry)} class="row">
          <span
            class="type-label"
            style="color: {iconColor(entry.type, entry.name)};"
          >{fileIcon(entry.type, entry.name)}</span>

          <span
            class="name"
            style="color: {entry.type === 'dir' ? 'var(--color-accent)' : 'var(--color-text)'};"
          >{entry.name}</span>

          {#if entry.type === 'file' && entry.size != null}
            <span class="size">{formatSize(entry.size)}</span>
          {/if}
        </a>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    word-break: break-all;
  }

  .crumb {
    color: var(--color-accent);
    text-decoration: none;
    padding: 2px 0;
  }

  .crumb:hover {
    text-decoration: underline;
  }

  .sep {
    user-select: none;
    padding: 0 4px;
    color: var(--color-dim);
  }

  .listing {
    display: flex;
    flex-direction: column;
  }

  .row {
    display: flex;
    align-items: center;
    min-height: 28px;
    padding: 4px 6px;
    text-decoration: none;
    transition: background 120ms ease;
  }

  .row:hover {
    background: var(--color-hover);
  }

  .type-label {
    flex-shrink: 0;
    width: 50px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }

  .name {
    flex: 1 1 auto;
    min-width: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.dim {
    color: var(--color-dim);
  }

  .size {
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    margin-left: 8px;
  }

  .empty {
    padding: 24px 0;
    text-align: center;
    font-size: 12px;
    color: var(--color-dim);
  }

  @media (max-width: 640px) {
    .row {
      min-height: 36px;
    }

    .type-label {
      width: 44px;
    }

    .size {
      font-size: 10px;
    }
  }
</style>
