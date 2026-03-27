<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

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

  const parentHref = $derived(
    data.breadcrumbs.length > 1
      ? `/gh/${data.organization}/${data.repoName}/tree/${data.breadcrumbs.slice(0, -1).map((c: { label: string }) => c.label).join('/')}`
      : `/gh/${data.organization}/${data.repoName}/tree`
  );
</script>

<div>
  <!-- Breadcrumb -->
  <nav class="mb-4 flex items-center gap-0 font-mono" style="font-size: 12px;" aria-label="File path">
    <a
      href="/gh/{data.organization}/{data.repoName}/tree"
      class="transition-colors"
      style="color: var(--color-accent); text-decoration: none;"
      onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
      onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
    >root</a>
    {#each data.breadcrumbs as crumb (crumb.href)}
      <span class="select-none px-1" style="color: var(--color-dim);">/</span>
      <a
        href={crumb.href}
        class="transition-colors"
        style="color: var(--color-accent); text-decoration: none;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
      >{crumb.label}</a>
    {/each}
  </nav>

  <!-- File list -->
  {#if data.entries.length === 0 && !data.path}
    <p class="py-6 text-center text-xs" style="color: var(--color-dim);">Empty directory</p>
  {:else}
    <div>
      <!-- Parent directory row -->
      {#if data.path}
        <a
          href={parentHref}
          class="flex items-center transition-colors"
          style="height: 24px; padding: 0 6px; text-decoration: none;"
          onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
          onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <!-- Type label placeholder -->
          <span
            class="shrink-0 font-mono"
            style="width: 50px; font-size: 10px; color: transparent;"
          >&nbsp;</span>

          <!-- Name -->
          <span
            class="font-mono"
            style="font-size: 12px; color: var(--color-dim);"
          >..</span>
        </a>
      {/if}

      <!-- Entries -->
      {#if data.entries.length === 0}
        <p class="py-6 text-center text-xs" style="color: var(--color-dim);">Empty directory</p>
      {:else}
        {#each data.entries as entry (entry.name)}
          <a
            href={entry.type === 'dir'
              ? `/gh/${data.organization}/${data.repoName}/tree/${entry.path}`
              : (entry.html_url ?? '#')}
            target={entry.type === 'file' ? '_blank' : undefined}
            rel={entry.type === 'file' ? 'noopener noreferrer' : undefined}
            class="flex items-center transition-colors"
            style="height: 24px; padding: 0 6px; text-decoration: none;"
            onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
            onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
          >
            <!-- File type label -->
            <span
              class="shrink-0 font-mono"
              style="width: 50px; font-size: 10px; color: {iconColor(entry.type, entry.name)};"
            >{fileIcon(entry.type, entry.name)}</span>

            <!-- Name -->
            <span
              class="min-w-0 flex-1 truncate font-mono"
              style="font-size: 12px; color: {entry.type === 'dir' ? 'var(--color-accent)' : 'var(--color-text)'};"
            >{entry.name}</span>

            <!-- Size -->
            {#if entry.type === 'file' && entry.size != null}
              <span
                class="shrink-0 font-mono"
                style="font-size: 11px; color: var(--color-dim);"
              >{formatSize(entry.size)}</span>
            {/if}
          </a>
        {/each}
      {/if}
    </div>
  {/if}
</div>
