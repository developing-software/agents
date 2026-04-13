<script lang="ts">
  import type { EditorFile } from "./config-types";

  interface Props {
    files: EditorFile[];
    activeIndex: number;
    onselect: (index: number) => void;
  }

  let { files, activeIndex, onselect }: Props = $props();
</script>

{#if files.length > 1}
  <div class="tab-bar">
    {#each files as file, i (file.path)}
      {@const isDirty = file.draftContent !== file.content}
      <button
        class="tab"
        class:tab-active={i === activeIndex}
        onclick={() => onselect(i)}
        title={file.path}
      >
        <span class="tab-name">{file.path.split("/").pop()}</span>
        {#if isDirty}
          <span class="tab-dirty" title="Unsaved changes">●</span>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .tab-bar {
    display: flex;
    align-items: stretch;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tab-bar::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    height: 30px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.1s;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab-active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .tab-active:hover {
    color: var(--color-accent);
  }

  .tab-name {
    line-height: 1;
  }

  .tab-dirty {
    font-size: 7px;
    color: var(--color-warning, #e89c3c);
    line-height: 1;
  }
</style>
