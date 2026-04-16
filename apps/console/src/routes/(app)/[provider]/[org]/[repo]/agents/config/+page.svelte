<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);
  const agentFiles = $derived(data.agentFiles);
</script>

<h2 class="section-heading">Agent Configuration</h2>

<div class="cards-row">
  <!-- .agents/ folder -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">.agents/ folder</span>
      {#if agentsFolder?.exists}
        <span class="status status-ok">Detected</span>
      {:else}
        <span class="status status-dim">Not found</span>
      {/if}
    </div>
    {#if !agentsFolder?.exists}
      <p class="hint">Create a .agents/ folder to define agent configurations and skills.</p>
    {/if}
    {#if agentsFolder?.exists && agentsFolder.entries.length > 0}
      <ul class="file-list">
        {#each agentsFolder.entries as entry (entry)}
          <li class="file-item">{entry}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- .claude/ folder -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">.claude/ folder</span>
      {#if claudeFiles.length > 0}
        <span class="status status-ok">{claudeFiles.length} file{claudeFiles.length === 1 ? '' : 's'}</span>
      {:else}
        <span class="status status-dim">Not found</span>
      {/if}
    </div>
    {#if claudeFiles.length === 0}
      <p class="hint">Add a .claude/ folder with settings and CLAUDE.md for Claude-based agents.</p>
    {/if}
    {#if claudeFiles.length > 0}
      <ul class="file-list">
        {#each claudeFiles as file (file)}
          <li class="file-item">{file}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- AGENTS.md files -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">AGENTS.md files</span>
      {#if agentFiles.length > 0}
        <span class="status status-ok">{agentFiles.length} file{agentFiles.length === 1 ? '' : 's'}</span>
      {:else}
        <span class="status status-dim">Not found</span>
      {/if}
    </div>
    {#if agentFiles.length === 0}
      <p class="hint">Add AGENTS.md files to provide instructions for your agents.</p>
    {/if}
    {#if agentFiles.length > 0}
      <ul class="file-list">
        {#each agentFiles as file (file.path)}
          <li class="file-item">
            <a
              href="/{data.provider}/{data.organization}/{data.repoName}/blob/{data.defaultBranch}/{file.path}"
              class="file-link"
            >{file.path}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Heading                                                             */
  /* ------------------------------------------------------------------ */
  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  /* ------------------------------------------------------------------ */
  /* Cards row                                                           */
  /* ------------------------------------------------------------------ */
  .cards-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  /* ------------------------------------------------------------------ */
  /* Card                                                                */
  /* ------------------------------------------------------------------ */
  .card {
    flex: 1;
    min-width: 0;
    min-height: 80px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
  }

  .hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 6px 0 0;
    line-height: 1.4;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .card-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text);
  }

  /* ------------------------------------------------------------------ */
  /* Status indicator                                                    */
  /* ------------------------------------------------------------------ */
  .status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    flex-shrink: 0;
  }

  .status-ok {
    color: var(--color-success);
  }

  .status-dim {
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* File list                                                           */
  /* ------------------------------------------------------------------ */
  .file-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .file-item {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ------------------------------------------------------------------ */
  /* File link                                                           */
  /* ------------------------------------------------------------------ */
  .file-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .file-link:hover {
    text-decoration: underline;
  }
</style>
