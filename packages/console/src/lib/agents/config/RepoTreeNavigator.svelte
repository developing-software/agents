<script lang="ts">
  import type { TreeNode, ContextFile } from './config-types';
  import { inferLanguage } from './config-types';
  import { getRepoTree, getFileContent } from './config.remote';

  let {
    organization,
    repoName,
    contextFiles = $bindable(),
    onfileclick,
  }: {
    organization: string;
    repoName: string;
    contextFiles: ContextFile[];
    onfileclick?: (path: string, content: string) => void;
  } = $props();

  let rootNodes = $state<TreeNode[]>([]);
  let expandedPaths = $state(new Set<string>());
  let loadingPaths = $state(new Set<string>());
  let filterText = $state('');
  let loading = $state(true);

  const contextPaths = $derived(new Set(contextFiles.map((f) => f.path)));

  // Load root on mount
  $effect(() => {
    loadDir('').then((nodes) => {
      rootNodes = nodes;
      loading = false;
    });
  });

  async function loadDir(path: string): Promise<TreeNode[]> {
    const entries = await getRepoTree({ organization, repoName, path });
    return entries.map((e) => ({
      name: e.name,
      path: e.path,
      type: e.type,
      children: e.type === 'dir' ? [] : undefined,
      loaded: e.type !== 'dir',
    }));
  }

  async function toggleExpand(node: TreeNode) {
    if (node.type !== 'dir') return;

    if (expandedPaths.has(node.path)) {
      expandedPaths.delete(node.path);
      expandedPaths = new Set(expandedPaths);
    } else {
      if (!node.loaded) {
        loadingPaths.add(node.path);
        loadingPaths = new Set(loadingPaths);
        const children = await loadDir(node.path);
        node.children = children;
        node.loaded = true;
        loadingPaths.delete(node.path);
        loadingPaths = new Set(loadingPaths);
      }
      expandedPaths.add(node.path);
      expandedPaths = new Set(expandedPaths);
    }
  }

  async function handleFileClick(node: TreeNode) {
    if (node.type === 'dir') {
      toggleExpand(node);
      return;
    }
    const content = await getFileContent({ organization, repoName, path: node.path });
    if (content != null) {
      onfileclick?.(node.path, content);
    }
  }

  async function addToContext(e: Event, node: TreeNode) {
    e.stopPropagation();
    if (contextPaths.has(node.path)) {
      contextFiles = contextFiles.filter((f) => f.path !== node.path);
      return;
    }
    if (contextFiles.length >= 10) return;

    const content = await getFileContent({ organization, repoName, path: node.path });
    if (content != null) {
      contextFiles = [
        ...contextFiles,
        { path: node.path, content, language: inferLanguage(node.path) },
      ];
    }
  }

  function fileIcon(name: string, type: 'file' | 'dir'): string {
    if (type === 'dir') return '';
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const icons: Record<string, string> = {
      md: 'M',
      ts: 'T',
      tsx: 'T',
      js: 'J',
      jsx: 'J',
      svelte: 'S',
      json: '{}',
      yml: 'Y',
      yaml: 'Y',
      css: '#',
      html: '<>',
      sql: 'Q',
      toml: 'C',
      py: 'P',
      rs: 'R',
      go: 'G',
    };
    return icons[ext] ?? '.';
  }

  function matchesFilter(node: TreeNode): boolean {
    if (!filterText) return true;
    const lower = filterText.toLowerCase();
    if (node.name.toLowerCase().includes(lower)) return true;
    if (node.type === 'dir' && node.children) {
      return node.children.some(matchesFilter);
    }
    return false;
  }

  function filteredNodes(nodes: TreeNode[]): TreeNode[] {
    if (!filterText) return nodes;
    return nodes.filter(matchesFilter);
  }
</script>

<div class="tree-navigator">
  <div class="tree-header">
    <input
      type="text"
      class="filter-input"
      placeholder="Filter files..."
      bind:value={filterText}
    />
  </div>

  <div class="tree-body">
    {#if loading}
      <p class="loading-msg">Loading...</p>
    {:else if rootNodes.length === 0}
      <p class="empty-msg">No files found</p>
    {:else}
      <ul class="tree-list" role="tree">
        {#each filteredNodes(rootNodes) as node (node.path)}
          {@render treeItem(node, 0)}
        {/each}
      </ul>
    {/if}
  </div>
</div>

{#snippet treeItem(node: TreeNode, depth: number)}
  <li class="tree-node" role="treeitem" aria-selected={contextPaths.has(node.path)}>
    <div
      class="node-row"
      class:node-dir={node.type === 'dir'}
      class:node-active={contextPaths.has(node.path)}
      role="button"
      tabindex="0"
      onclick={() => handleFileClick(node)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFileClick(node); } }}
    >
      <span class="node-indent" style="width: {depth * 16}px"></span>

      {#if node.type === 'dir'}
        <span class="expand-icon" class:expand-open={expandedPaths.has(node.path)}>
          {#if loadingPaths.has(node.path)}
            <span class="spinner"></span>
          {:else}
            &#9656;
          {/if}
        </span>
        <span class="folder-icon">&#128193;</span>
      {:else}
        <span class="file-type-icon">{fileIcon(node.name, node.type)}</span>
      {/if}

      <span class="node-name">{node.name}</span>

      {#if node.type === 'file'}
        <button
          type="button"
          class="ctx-btn"
          class:ctx-active={contextPaths.has(node.path)}
          onclick={(e) => addToContext(e, node)}
          title={contextPaths.has(node.path) ? 'Remove from context' : 'Add to AI context'}
        >
          {#if contextPaths.has(node.path)}&#10003;{:else}+{/if}
        </button>
      {/if}
    </div>

    {#if node.type === 'dir' && expandedPaths.has(node.path) && node.children}
      <ul class="tree-list" role="group">
        {#each filteredNodes(node.children) as child (child.path)}
          {@render treeItem(child, depth + 1)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

<style>
  .tree-navigator {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .tree-header {
    padding: 6px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .filter-input {
    width: 100%;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    outline: none;
    transition: border-color 0.1s;
  }
  .filter-input::placeholder { color: var(--color-dim); }
  .filter-input:focus { border-color: var(--color-accent); }

  .tree-body {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0;
  }

  .tree-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .node-row {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 2px 8px 2px 4px;
    border: none;
    background: none;
    cursor: pointer;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    text-align: left;
    transition: background 0.08s, color 0.08s;
  }
  .node-row:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }
  .node-active {
    background: var(--color-accent-dim);
  }
  .node-dir {
    color: var(--color-text);
  }

  .node-indent { flex-shrink: 0; }

  .expand-icon {
    font-size: 10px;
    width: 12px;
    text-align: center;
    flex-shrink: 0;
    color: var(--color-dim);
    transition: transform 0.12s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .expand-open { transform: rotate(90deg); }

  .folder-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .file-type-icon {
    font-size: 9px;
    width: 16px;
    height: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    background: var(--color-elevated);
    color: var(--color-dim);
    flex-shrink: 0;
    font-weight: 600;
    margin-left: 12px;
  }

  .node-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .ctx-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    width: 18px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s, background 0.1s, border-color 0.1s;
  }
  .node-row:hover .ctx-btn { opacity: 1; }
  .ctx-active {
    opacity: 1;
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    color: var(--color-accent);
    border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
  .ctx-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .loading-msg, .empty-msg {
    font-size: 11px;
    color: var(--color-dim);
    padding: 12px;
  }

  .spinner {
    display: inline-block;
    width: 8px;
    height: 8px;
    border: 1.5px solid var(--color-dim);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
