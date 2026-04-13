<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import { buildTree, fileIcon, type TreeNode, type ContextFile } from "./config-types";
  import { getRepoTree, getFileContent } from "./config.remote";

  interface Props {
    organization: string;
    repoName: string;
    contextPaths: string[];
    onadd: (file: ContextFile) => void;
  }

  let { organization, repoName, contextPaths, onadd }: Props = $props();

  // Panel state
  let expanded = $state(true);

  // Tree data
  let treeEntries = $state<Array<{ path: string; type: "file" | "dir" }> | null>(null);
  let treeError = $state<string | null>(null);
  let treeLoading = $state(false);

  // Which directories are open
  let expandedPaths = new SvelteSet<string>();

  // Search
  let searchQuery = $state("");

  // Path currently being fetched for context
  let fetchingPath = $state<string | null>(null);

  const tree = $derived(treeEntries ? buildTree(treeEntries) : []);

  const filteredEntries = $derived(
    searchQuery.trim()
      ? (treeEntries ?? []).filter(
          (e) => e.type === "file" && e.path.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : null,
  );

  async function loadTree() {
    if (treeLoading || treeEntries !== null) return;
    treeLoading = true;
    treeError = null;
    try {
      const result = await getRepoTree({ organization, repoName });
      treeEntries = result;
    } catch (e) {
      treeError = e instanceof Error ? e.message : "Failed to load tree";
    } finally {
      treeLoading = false;
    }
  }

  function toggleDir(path: string) {
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path);
    } else {
      expandedPaths.add(path);
    }
  }

  async function addToContext(path: string) {
    if (contextPaths.includes(path) || fetchingPath !== null) return;
    fetchingPath = path;
    try {
      const { content } = await getFileContent({ organization, repoName, path });
      if (content !== null) {
        onadd({ path, content });
      }
    } finally {
      fetchingPath = null;
    }
  }

  function togglePanel() {
    expanded = !expanded;
    if (expanded && treeEntries === null && !treeLoading) {
      loadTree();
    }
  }

  // Load tree on initial mount if panel starts expanded
  loadTree();
</script>

{#snippet treeNode(node: TreeNode, depth: number)}
  <li class="tree-item">
    {#if node.type === "dir"}
      <button
        class="tree-row tree-dir"
        style:padding-left="{8 + depth * 14}px"
        onclick={() => toggleDir(node.path)}
      >
        <span class="node-icon">{expandedPaths.has(node.path) ? "▾" : "▸"}</span>
        <span class="node-name">{node.name}/</span>
      </button>
      {#if expandedPaths.has(node.path) && node.children && node.children.length > 0}
        <ul class="tree-list">
          {#each node.children as child (child.path)}
            {@render treeNode(child, depth + 1)}
          {/each}
        </ul>
      {/if}
    {:else}
      {@const inCtx = contextPaths.includes(node.path)}
      {@const fetching = fetchingPath === node.path}
      <button
        class="tree-row tree-file"
        class:in-context={inCtx}
        style:padding-left="{8 + depth * 14}px"
        onclick={() => addToContext(node.path)}
        disabled={fetching}
        title={node.path}
      >
        <span class="node-icon file-icon">{fileIcon(node.name, "file")}</span>
        <span class="node-name">{node.name}</span>
        {#if inCtx}
          <span class="ctx-badge">ctx</span>
        {:else if fetching}
          <span class="ctx-badge loading">…</span>
        {:else}
          <span class="add-hint">+</span>
        {/if}
      </button>
    {/if}
  </li>
{/snippet}

<div class="navigator">
  <!-- Header -->
  <button class="nav-header" onclick={togglePanel}>
    <span class="nav-title">Repository</span>
    <span class="collapse-icon">{expanded ? "▾" : "▸"}</span>
  </button>

  {#if expanded}
    <!-- Search -->
    <div class="search-wrap">
      <input
        type="text"
        class="search-input"
        placeholder="Filter files…"
        bind:value={searchQuery}
      />
    </div>

    <!-- Tree content -->
    <div class="tree-scroll">
      {#if treeLoading}
        <div class="tree-status">
          <span class="loading-dots">
            <span>·</span><span>·</span><span>·</span>
          </span>
        </div>
      {:else if treeError}
        <div class="tree-error">{treeError}</div>
      {:else if filteredEntries !== null}
        {#if filteredEntries.length === 0}
          <div class="tree-empty">No matches</div>
        {:else}
          <ul class="tree-list">
            {#each filteredEntries as entry (entry.path)}
              {@const inCtx = contextPaths.includes(entry.path)}
              {@const fetching = fetchingPath === entry.path}
              <li class="tree-item">
                <button
                  class="tree-row tree-file flat"
                  class:in-context={inCtx}
                  onclick={() => addToContext(entry.path)}
                  disabled={fetching}
                  title={entry.path}
                >
                  <span class="node-icon file-icon">{fileIcon(entry.path.split("/").pop() ?? "", "file")}</span>
                  <span class="node-name flat-path">{entry.path}</span>
                  {#if inCtx}
                    <span class="ctx-badge">ctx</span>
                  {:else if fetching}
                    <span class="ctx-badge loading">…</span>
                  {:else}
                    <span class="add-hint">+</span>
                  {/if}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {:else if tree.length === 0}
        <div class="tree-empty">Empty repository</div>
      {:else}
        <ul class="tree-list">
          {#each tree as node (node.path)}
            {@render treeNode(node, 0)}
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Navigator shell                                                     */
  /* ------------------------------------------------------------------ */
  .navigator {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    width: 100%;
    text-align: left;
  }

  .nav-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  .collapse-icon {
    font-size: 10px;
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                              */
  /* ------------------------------------------------------------------ */
  .search-wrap {
    padding: 6px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    background: var(--color-elevated);
  }

  .search-input {
    width: 100%;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 7px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    outline: none;
    box-sizing: border-box;
  }

  .search-input::placeholder {
    color: var(--color-dim);
  }

  .search-input:focus {
    border-color: var(--color-accent);
  }

  /* ------------------------------------------------------------------ */
  /* Tree scroll area                                                    */
  /* ------------------------------------------------------------------ */
  .tree-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* ------------------------------------------------------------------ */
  /* Status / error / empty                                              */
  /* ------------------------------------------------------------------ */
  .tree-status {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .loading-dots {
    display: flex;
    gap: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 18px;
    color: var(--color-dim);
  }

  .loading-dots span {
    animation: blink 1.2s ease-in-out infinite;
  }

  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes blink {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  .tree-error {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e06c75);
    padding: 10px 12px;
    line-height: 1.5;
  }

  .tree-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 10px 12px;
  }

  /* ------------------------------------------------------------------ */
  /* Tree list                                                           */
  /* ------------------------------------------------------------------ */
  .tree-list {
    list-style: none;
    margin: 0;
    padding: 3px 0;
  }

  .tree-item {
    margin: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Row (shared)                                                        */
  /* ------------------------------------------------------------------ */
  .tree-row {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding: 2px 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--color-muted);
    transition: background 0.08s, color 0.08s;
    min-height: 22px;
    box-sizing: border-box;
  }

  .tree-row:hover {
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    color: var(--color-text);
  }

  .tree-dir {
    color: var(--color-text);
    font-weight: 500;
  }

  .tree-file.in-context {
    color: var(--color-accent);
  }

  .tree-file:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .tree-file.flat {
    padding-left: 10px;
  }

  /* ------------------------------------------------------------------ */
  /* Node parts                                                          */
  /* ------------------------------------------------------------------ */
  .node-icon {
    font-size: 9px;
    flex-shrink: 0;
    color: var(--color-dim);
    width: 10px;
    text-align: center;
    line-height: 1;
  }

  .file-icon {
    font-size: 10px;
  }

  .node-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flat-path {
    font-size: 10px;
  }

  /* ------------------------------------------------------------------ */
  /* Context badge / add hint                                            */
  /* ------------------------------------------------------------------ */
  .ctx-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: var(--color-accent);
    flex-shrink: 0;
    line-height: 1.4;
  }

  .ctx-badge.loading {
    background: transparent;
    color: var(--color-dim);
  }

  .add-hint {
    font-size: 13px;
    color: var(--color-dim);
    opacity: 0;
    flex-shrink: 0;
    transition: opacity 0.1s;
    width: 12px;
    text-align: center;
    line-height: 1;
  }

  .tree-row:hover .add-hint {
    opacity: 0.6;
  }
</style>
