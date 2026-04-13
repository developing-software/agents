<script lang="ts">
  import type { PageProps } from './$types';
  import type { EditorTab, ContextFile } from '$lib/agents/config/config-types';
  import AgentMdEditor from '$lib/agents/config/AgentMdEditor.svelte';
  import AgentMdTabs from '$lib/agents/config/AgentMdTabs.svelte';
  import RepoTreeNavigator from '$lib/agents/config/RepoTreeNavigator.svelte';
  import ContextFilesList from '$lib/agents/config/ContextFilesList.svelte';
  import ConfigAiChat from '$lib/agents/config/ConfigAiChat.svelte';
  import { saveAgentsMdFile } from '$lib/agents/config/config.remote';

  let { data }: PageProps = $props();

  const organization = $derived(data.organization);
  const repoName = $derived(data.repoName);
  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);
  const agentFileContents = $derived(data.agentFileContents);

  // Editor state
  let tabs = $state<EditorTab[]>([]);
  let activeTabIndex = $state(0);
  let saving = $state(false);
  let contextFiles = $state<ContextFile[]>([]);
  let chatOpen = $state(false);

  // Build tabs from loaded file contents
  $effect(() => {
    if (agentFileContents.length > 0 && tabs.length === 0) {
      tabs = agentFileContents.map((f) => ({
        path: f.path,
        originalContent: f.content,
        currentContent: f.content,
        mode: 'preview' as const,
      }));
    }
  });

  const activeTab = $derived(tabs[activeTabIndex]);
  const isDirty = $derived(activeTab ? activeTab.currentContent !== activeTab.originalContent : false);
  const anyDirty = $derived(tabs.some((t) => t.currentContent !== t.originalContent));

  async function handleSave() {
    if (!activeTab || saving) return;
    saving = true;
    try {
      const fileInfo = agentFileContents.find((f) => f.path === activeTab.path);
      await saveAgentsMdFile({
        organization,
        repoName,
        path: activeTab.path,
        content: activeTab.currentContent,
        sha: fileInfo?.sha ?? '',
      });
      // Update the original content to match saved
      tabs[activeTabIndex]!.originalContent = activeTab.currentContent;
      tabs = [...tabs];
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      saving = false;
    }
  }

  function handleDiscard() {
    if (!activeTab) return;
    tabs[activeTabIndex]!.currentContent = activeTab.originalContent;
    tabs = [...tabs];
  }

  function handleFileClick(path: string, content: string) {
    // If it's an AGENTS.md file, switch to its tab
    const tabIdx = tabs.findIndex((t) => t.path === path);
    if (tabIdx >= 0) {
      activeTabIndex = tabIdx;
      return;
    }
    // Otherwise could open a preview — for now just log
  }

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (anyDirty) {
      e.preventDefault();
    }
  }
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<div class="config-page">
  <!-- Header with status cards -->
  <div class="config-header">
    <h2 class="section-heading">Agent Configuration</h2>
    <div class="cards-row">
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

      <div class="card">
        <div class="card-header">
          <span class="card-title">AGENTS.md files</span>
          {#if agentFileContents.length > 0}
            <span class="status status-ok">{agentFileContents.length} file{agentFileContents.length === 1 ? '' : 's'}</span>
          {:else}
            <span class="status status-dim">Not found</span>
          {/if}
        </div>
        {#if agentFileContents.length === 0}
          <p class="hint">Add AGENTS.md files to provide instructions for your agents.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Main workspace -->
  {#if agentFileContents.length > 0}
    <div class="workspace">
      <!-- Left: Tree navigator -->
      <div class="panel panel-tree">
        <div class="panel-label">Files</div>
        <RepoTreeNavigator
          {organization}
          {repoName}
          bind:contextFiles
          onfileclick={handleFileClick}
        />
      </div>

      <!-- Center: Editor -->
      <div class="panel panel-editor">
        <AgentMdTabs {tabs} bind:activeIndex={activeTabIndex} />
        {#if activeTab}
          <AgentMdEditor
            bind:content={activeTab.currentContent}
            path={activeTab.path}
            dirty={isDirty}
            {saving}
            onsave={handleSave}
            ondiscard={handleDiscard}
          />
        {/if}
      </div>

      <!-- Right: Context + Chat -->
      <div class="panel panel-sidebar">
        <div class="sidebar-section sidebar-context">
          <ContextFilesList bind:files={contextFiles} />
        </div>

        <div class="sidebar-section sidebar-chat" class:chat-expanded={chatOpen}>
          {#if !chatOpen}
            <button type="button" class="open-chat-btn" onclick={() => { chatOpen = true; }}>
              <span class="chat-icon">&#9672;</span>
              Open AI Assistant
            </button>
          {:else}
            <div class="chat-wrapper">
              <div class="chat-collapse-row">
                <button type="button" class="collapse-btn" onclick={() => { chatOpen = false; }}>
                  &#9662; Collapse
                </button>
              </div>
              <ConfigAiChat
                {organization}
                {repoName}
                agentsMdPath={activeTab?.path ?? ''}
                agentsMdContent={activeTab?.currentContent ?? ''}
                {contextFiles}
              />
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Page layout                                                         */
  /* ------------------------------------------------------------------ */
  .config-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: calc(100vh - 130px);
    min-height: 500px;
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  .config-header {
    flex-shrink: 0;
  }

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

  .cards-row {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .card {
    flex: 1;
    min-width: 0;
    min-height: 60px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 10px 12px;
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

  .status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    flex-shrink: 0;
  }
  .status-ok { color: var(--color-success); }
  .status-dim { color: var(--color-dim); }

  .hint {
    font-size: 11px;
    color: var(--color-dim);
    margin: 4px 0 0;
    line-height: 1.4;
  }

  .file-list {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
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
  /* Workspace                                                           */
  /* ------------------------------------------------------------------ */
  .workspace {
    flex: 1;
    display: flex;
    gap: 1px;
    background: var(--color-border);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    min-height: 0;
  }

  .panel {
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel-tree {
    width: 240px;
    flex-shrink: 0;
  }

  .panel-editor {
    flex: 1;
    min-width: 0;
  }

  .panel-sidebar {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
  }

  .panel-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Sidebar sections                                                    */
  /* ------------------------------------------------------------------ */
  .sidebar-section {
    display: flex;
    flex-direction: column;
  }

  .sidebar-context {
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-chat {
    flex: 1;
    min-height: 0;
  }

  .chat-expanded {
    display: flex;
    flex-direction: column;
  }

  .open-chat-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 12px;
    margin: 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.1s;
  }
  .open-chat-btn:hover {
    color: var(--color-text);
    border-color: var(--color-border-bright);
  }

  .chat-icon { font-size: 14px; }

  .chat-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .chat-collapse-row {
    padding: 4px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .collapse-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    background: none;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    padding: 2px 4px;
  }
  .collapse-btn:hover { color: var(--color-muted); }

  /* ------------------------------------------------------------------ */
  /* Responsive                                                          */
  /* ------------------------------------------------------------------ */
  @media (max-width: 900px) {
    .workspace {
      flex-direction: column;
      height: auto;
    }
    .panel-tree {
      width: 100%;
      max-height: 200px;
    }
    .panel-sidebar {
      width: 100%;
      max-height: 400px;
    }
    .panel-editor {
      min-height: 300px;
    }
  }
</style>
