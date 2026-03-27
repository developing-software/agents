<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  function fileIcon(type: string, name: string): string {
    if (type === 'dir') return '📁';
    const ext = name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      ts: '🟦', tsx: '🟦', js: '🟨', jsx: '🟨',
      svelte: '🟧', vue: '🟩', py: '🐍', go: '🐹',
      rs: '🦀', md: '📝', json: '📋', yaml: '📋', yml: '📋',
      toml: '📋', css: '🎨', html: '🌐', sh: '⚙️',
    };
    return icons[ext ?? ''] ?? '📄';
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const parentHref = $derived(
    data.breadcrumbs.length > 1
      ? `/gh/${data.organization}/${data.repoName}/tree/${data.breadcrumbs.slice(0, -1).map((c) => c.label).join('/')}`
      : `/gh/${data.organization}/${data.repoName}/tree`
  );
</script>

<div>
  <!-- Breadcrumb -->
  <nav class="mb-5 flex items-center gap-1 font-mono text-sm" aria-label="File path">
    <a
      href="/gh/{data.organization}/{data.repoName}/tree"
      class="transition-colors hover:underline"
      style="color: var(--color-accent);"
    >root</a>
    {#each data.breadcrumbs as crumb (crumb.href)}
      <span class="select-none" style="color: var(--color-dim);">/</span>
      <a
        href={crumb.href}
        class="transition-colors hover:underline"
        style="color: var(--color-accent);"
      >{crumb.label}</a>
    {/each}
  </nav>

  <!-- File tree -->
  <div
    class="overflow-hidden rounded-lg border"
    style="background: var(--color-surface); border-color: var(--color-border);"
  >
    <!-- Parent directory link -->
    {#if data.path}
      <a
        href={parentHref}
        class="flex items-center gap-3 border-b px-4 py-2.5 font-mono text-sm transition-colors"
        style="background: var(--color-elevated); border-color: var(--color-border); color: var(--color-muted);"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-elevated)')}
      >
        <span class="w-4 text-center">📁</span>
        <span>..</span>
      </a>
    {/if}

    <!-- Entries -->
    {#if data.entries.length === 0}
      <p
        class="px-4 py-10 text-center text-sm"
        style="color: var(--color-muted);"
      >Empty directory</p>
    {:else}
      {#each data.entries as entry (entry.name)}
        <a
          href={entry.type === 'dir'
            ? `/gh/${data.organization}/${data.repoName}/tree/${entry.path}`
            : (entry.html_url ?? '#')}
          target={entry.type === 'file' ? '_blank' : undefined}
          rel={entry.type === 'file' ? 'noopener noreferrer' : undefined}
          class="flex items-center gap-3 border-b px-4 py-2.5 font-mono text-sm transition-colors last:border-b-0"
          style="border-color: var(--color-border);"
          onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
          onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <!-- Icon -->
          <span class="w-4 shrink-0 text-center">{fileIcon(entry.type, entry.name)}</span>

          <!-- Name -->
          <span
            class="flex-1"
            style={entry.type === 'dir'
              ? 'color: var(--color-accent);'
              : 'color: var(--color-text);'}
          >{entry.name}</span>

          <!-- Size -->
          {#if entry.type === 'file' && entry.size != null}
            <span
              class="shrink-0 text-xs"
              style="color: var(--color-muted);"
            >{formatSize(entry.size)}</span>
          {/if}
        </a>
      {/each}
    {/if}
  </div>
</div>
