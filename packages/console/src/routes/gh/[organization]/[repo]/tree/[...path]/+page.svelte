<script lang="ts">
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();

  function fileIcon(type: string, name: string) {
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
</script>

<div>
  <!-- Breadcrumb -->
  <nav class="mb-4 flex items-center gap-1 text-sm font-mono">
    <a
      href="/gh/{data.organization}/{data.repoName}/tree"
      class="text-blue-400 hover:underline"
    >root</a>
    {#each data.breadcrumbs as crumb}
      <span class="text-gray-600">/</span>
      <a href={crumb.href} class="text-blue-400 hover:underline">{crumb.label}</a>
    {/each}
  </nav>

  <!-- File tree -->
  <div class="rounded-lg border border-gray-800 overflow-hidden">
    {#if data.path}
      <a
        href="/gh/{data.organization}/{data.repoName}/tree{data.breadcrumbs.length > 1 ? '/' + data.breadcrumbs.slice(0, -1).map(c => c.label).join('/') : ''}"
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800 transition-colors text-sm font-mono"
      >
        <span>📁</span>
        <span>..</span>
      </a>
    {/if}

    {#each data.entries as entry, i}
      {@const isLast = i === data.entries.length - 1}
      <a
        href={entry.type === 'dir'
          ? `/gh/${data.organization}/${data.repoName}/tree/${entry.path}`
          : entry.html_url ?? '#'}
        target={entry.type === 'file' ? '_blank' : undefined}
        rel={entry.type === 'file' ? 'noopener noreferrer' : undefined}
        class="flex items-center gap-3 px-4 py-2.5 text-sm font-mono transition-colors hover:bg-gray-800
          {isLast ? '' : 'border-b border-gray-800'}
          {entry.type === 'dir' ? 'text-blue-300' : 'text-gray-200'}"
      >
        <span class="w-4 text-center">{fileIcon(entry.type, entry.name)}</span>
        <span class="flex-1">{entry.name}</span>
        {#if entry.type === 'file' && entry.size}
          <span class="text-xs text-gray-500">{(entry.size / 1024).toFixed(1)} KB</span>
        {/if}
      </a>
    {/each}

    {#if data.entries.length === 0}
      <p class="px-4 py-6 text-sm text-gray-500 text-center">Empty directory</p>
    {/if}
  </div>
</div>
