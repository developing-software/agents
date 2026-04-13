<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { getRepoTree } from './config.remote';
  import type { RepoTreeNode } from './config-types';

  type TreeRow = {
    path: string;
    name: string;
    type: 'dir' | 'file';
    size?: number;
    depth: number;
    parentPath: string | null;
  };

  let {
    organization,
    repoName,
    rootNodes,
    allPaths,
    selectedPath = null,
    contextPaths,
    handleSelectFile,
    handleAddContext,
    handleRemoveContext,
  }: {
    organization: string;
    repoName: string;
    rootNodes: RepoTreeNode[];
    allPaths: string[];
    selectedPath?: string | null;
    contextPaths: string[];
    handleSelectFile?: (path: string) => void;
    handleAddContext?: (path: string) => void;
    handleRemoveContext?: (path: string) => void;
  } = $props();

  const storageKey = $derived(`config-tree-expanded:${organization}/${repoName}`);

  let filterText = $state('');
  let expanded = $state<Set<string>>(new Set());
  let loadedChildren = $state<Record<string, RepoTreeNode[]>>({});
  let loading = $state<Record<string, boolean>>({});
  let activeRow = $state<string | null>(untrack(() => selectedPath));
  let treeArea: HTMLElement | undefined = $state();

  const filterMatches = $derived.by(() => {
    const needle = filterText.trim().toLowerCase();
    if (!needle) return [];
    return allPaths
      .filter((path) => path.toLowerCase().includes(needle))
      .slice(0, 200);
  });

  const rows = $derived.by(() => {
    const out: TreeRow[] = [];

    const walk = (nodes: RepoTreeNode[], depth: number, parentPath: string | null) => {
      for (const node of nodes) {
        out.push({
          path: node.path,
          name: node.name,
          type: node.type,
          size: node.size,
          depth,
          parentPath,
        });

        if (node.type === 'dir' && expanded.has(node.path)) {
          const children = loadedChildren[node.path] ?? [];
          walk(children, depth + 1, node.path);
        }
      }
    };

    walk(rootNodes, 0, null);
    return out;
  });

  onMount(() => {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const paths = JSON.parse(raw) as string[];
      expanded = new Set(paths);
      for (const path of paths.slice(0, 32)) {
        void ensureLoaded(path);
      }
    } catch {
      // Ignore malformed values.
    }
  });

  $effect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(storageKey, JSON.stringify([...expanded]));
  });

  $effect(() => {
    activeRow = selectedPath;
  });

  async function ensureLoaded(path: string) {
    if (loadedChildren[path] || loading[path]) return;
    loading[path] = true;
    try {
      const children = await getRepoTree({ organization, repoName, path });
      loadedChildren[path] = children as RepoTreeNode[];
    } finally {
      loading[path] = false;
    }
  }

  async function toggleDir(path: string) {
    if (expanded.has(path)) {
      const next = new Set(expanded);
      next.delete(path);
      expanded = next;
      return;
    }

    const next = new Set(expanded);
    next.add(path);
    expanded = next;
    await ensureLoaded(path);
  }

  function icon(name: string, type: 'file' | 'dir') {
    if (type === 'dir') return expanded.has(name) ? '▾' : '▸';

    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'md') return 'M';
    if (ext === 'ts' || ext === 'tsx') return 'TS';
    if (ext === 'json') return 'J';
    if (ext === 'svelte') return 'S';
    return 'F';
  }

  function isInContext(path: string): boolean {
    return contextPaths.includes(path);
  }

  async function selectFile(path: string, withContext: boolean = false) {
    activeRow = path;
    await tick();
    scrollTo(path);

    if (withContext) {
      if (isInContext(path)) handleRemoveContext?.(path);
      else handleAddContext?.(path);
      return;
    }

    handleSelectFile?.(path);
  }

  function scrollTo(path: string) {
    if (!treeArea || typeof CSS === 'undefined') return;
    const selector = `[data-path="${CSS.escape(path)}"]`;
    const row = treeArea.querySelector(selector) as HTMLElement | null;
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function handleRowKeydown(event: KeyboardEvent) {
    if (filterText.trim()) return;
    if (rows.length === 0) return;

    const currentIndex = Math.max(0, rows.findIndex((row) => row.path === activeRow));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = rows[Math.min(rows.length - 1, currentIndex + 1)];
      if (!next) return;
      activeRow = next.path;
      scrollTo(next.path);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = rows[Math.max(0, currentIndex - 1)];
      if (!prev) return;
      activeRow = prev.path;
      scrollTo(prev.path);
      return;
    }

    const current = rows[currentIndex];
    if (!current) return;

    if (event.key === 'ArrowRight' && current.type === 'dir') {
      event.preventDefault();
      void toggleDir(current.path);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (current.type === 'dir' && expanded.has(current.path)) {
        void toggleDir(current.path);
        return;
      }
      if (current.parentPath) {
        activeRow = current.parentPath;
        scrollTo(current.parentPath);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (current.type === 'dir') {
        void toggleDir(current.path);
      } else {
        void selectFile(current.path);
      }
    }
  }
</script>

<section class="tree-card">
  <header class="tree-header">
    <div class="title">Repository Tree</div>
    <input
      class="filter"
      bind:value={filterText}
      placeholder="Filter files..."
      aria-label="Filter files"
    />
  </header>

  <div
    class="tree"
    bind:this={treeArea}
    tabindex="0"
    role="tree"
    aria-label="Repository file tree"
    onkeydown={handleRowKeydown}
  >
    {#if filterText.trim()}
      {#if filterMatches.length === 0}
        <div class="empty">No matches</div>
      {:else}
        {#each filterMatches as path (path)}
          <div class="row row-file" class:row-active={activeRow === path} data-path={path}>
            <button type="button" class="row-main" onclick={() => selectFile(path)}>
              <span class="icon">F</span>
              <span class="name">{path}</span>
            </button>
            <button type="button" class="add-btn" class:add-active={isInContext(path)} onclick={() => selectFile(path, true)}>
              {isInContext(path) ? 'In ctx' : '+Ctx'}
            </button>
          </div>
        {/each}
      {/if}
    {:else}
      {#if rows.length === 0}
        <div class="empty">Repository tree unavailable</div>
      {:else}
        {#each rows as row (row.path)}
          <div class="row" class:row-active={activeRow === row.path} class:row-file={row.type === 'file'} data-path={row.path}>
            <button
              type="button"
              class="row-main"
              style="padding-left: {8 + row.depth * 14}px"
              onclick={(event) => {
                if (row.type === 'dir') {
                  void toggleDir(row.path);
                  return;
                }

                if (event.metaKey || event.ctrlKey) {
                  void selectFile(row.path, true);
                  return;
                }

                void selectFile(row.path);
              }}
            >
              <span class="icon">{icon(row.path, row.type)}</span>
              <span class="name">{row.name}</span>
              {#if row.type === 'dir' && loading[row.path]}
                <span class="loading">...</span>
              {/if}
            </button>

            {#if row.type === 'file'}
              <button type="button" class="add-btn" class:add-active={isInContext(row.path)} onclick={() => selectFile(row.path, true)}>
                {isInContext(row.path) ? 'In ctx' : '+Ctx'}
              </button>
            {/if}
          </div>
        {/each}
      {/if}
    {/if}
  </div>
</section>

<style>
  .tree-card {
    min-height: 0;
    height: 100%;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
  }

  .tree-header {
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
  }

  .filter {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-bg);
    color: var(--color-text);
    padding: 6px 8px;
    font-size: 12px;
  }

  .tree {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding: 6px;
    scroll-behavior: smooth;
  }

  .empty {
    font-size: 12px;
    color: var(--color-dim);
    padding: 8px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 5px;
  }

  .row-active {
    background: color-mix(in srgb, var(--color-accent) 11%, transparent);
  }

  .row-main {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 28px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    text-align: left;
    border-radius: 5px;
  }

  .row-main:hover {
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  .icon {
    width: 22px;
    flex-shrink: 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-align: center;
  }

  .name {
    min-width: 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .loading {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .add-btn {
    margin-right: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-dim);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 2px 6px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .add-active {
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
  }

  .row-file .icon {
    color: var(--color-accent);
  }
</style>
