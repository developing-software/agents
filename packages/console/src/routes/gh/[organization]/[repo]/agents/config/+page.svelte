<script lang="ts">
  import type { PageProps } from "./$types";
  import AgentMdEditor from "$lib/agents/config/AgentMdEditor.svelte";
  import AgentMdTabs from "$lib/agents/config/AgentMdTabs.svelte";
  import RepoTreeNavigator from "$lib/agents/config/RepoTreeNavigator.svelte";
  import ContextFilesList from "$lib/agents/config/ContextFilesList.svelte";
  import ConfigAiChat from "$lib/agents/config/ConfigAiChat.svelte";
  import { saveAgentsMdFile } from "$lib/agents/config/config.remote";
  import type { EditorFile, ContextFile } from "$lib/agents/config/config-types";
  import { invalidateAll } from "$app/navigation";

  let { data }: PageProps = $props();

  // Track edit state keyed by file path so it survives data refreshes
  let editState = $state<Record<string, { draft: string; editMode: boolean }>>({});
  let activeIndex = $state(0);

  // Derive editorFiles from data + editState so updates to data are reflected
  const editorFiles = $derived(
    data.agentFiles.map((f) => {
      const edit = editState[f.path];
      return {
        path: f.path,
        sha: f.sha,
        content: f.content,
        draftContent: edit?.draft ?? f.content,
        editMode: edit?.editMode ?? false,
      } satisfies EditorFile;
    }),
  );

  const activeFile = $derived(editorFiles[activeIndex] ?? null);

  // --- Context files for AI chat ---
  let contextFiles = $state<ContextFile[]>([]);

  // --- Save state ---
  let saving = $state(false);
  let saveResult = $state<{ mode: string; pr?: { number: number; url: string } } | null>(null);

  // --- Status summary (reactive to data updates) ---
  const agentsFolder = $derived(data.agentsFolder);
  const claudeFiles = $derived(data.claudeFolder);
  const agentFilesCount = $derived(data.agentFiles.length);

  function selectTab(index: number) {
    activeIndex = index;
    saveResult = null;
  }

  function updateDraft(draftContent: string) {
    if (!activeFile) return;
    editState = { ...editState, [activeFile.path]: { draft: draftContent, editMode: true } };
  }

  function discardEdits() {
    if (!activeFile) return;
    const { [activeFile.path]: _, ...rest } = editState;
    editState = rest;
    saveResult = null;
  }

  async function save(mode: "direct" | "pr") {
    if (!activeFile || saving) return;
    saving = true;
    saveResult = null;
    try {
      const result = await saveAgentsMdFile({
        organization: data.organization,
        repoName: data.repoName,
        path: activeFile.path,
        content: activeFile.draftContent,
        mode,
      });
      saveResult = result;

      // Clear edit state for this file — data will reflect the saved content
      const { [activeFile.path]: _, ...rest } = editState;
      editState = rest;

      if (mode === "direct") {
        await invalidateAll();
      }
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      saving = false;
    }
  }

  function addContextFile(file: ContextFile) {
    if (!contextFiles.some((f) => f.path === file.path)) {
      contextFiles = [...contextFiles, file];
    }
  }

  function removeContextFile(path: string) {
    contextFiles = contextFiles.filter((f) => f.path !== path);
  }
</script>

<div class="config-page">
  <!-- Top status bar -->
  <div class="status-bar">
    <h2 class="section-heading">Agent Configuration</h2>
    <div class="status-chips">
      <span class="chip" class:chip-ok={agentsFolder?.exists} class:chip-dim={!agentsFolder?.exists}>
        .agents/ {agentsFolder?.exists ? "detected" : "not found"}
      </span>
      <span class="chip" class:chip-ok={claudeFiles.length > 0} class:chip-dim={claudeFiles.length === 0}>
        .claude/ {claudeFiles.length > 0 ? `${claudeFiles.length} file${claudeFiles.length === 1 ? "" : "s"}` : "not found"}
      </span>
      <span class="chip" class:chip-ok={agentFilesCount > 0} class:chip-dim={agentFilesCount === 0}>
        AGENTS.md {agentFilesCount > 0 ? `${agentFilesCount} file${agentFilesCount === 1 ? "" : "s"}` : "not found"}
      </span>
    </div>
  </div>

  <!-- Three-panel layout -->
  <div class="panels">
    <!-- Left: Repo tree -->
    <div class="panel panel-tree">
      <RepoTreeNavigator
        organization={data.organization}
        repoName={data.repoName}
        contextPaths={contextFiles.map((f) => f.path)}
        onadd={addContextFile}
      />
    </div>

    <!-- Center: Editor -->
    <div class="panel panel-editor">
      {#if editorFiles.length === 0}
        <div class="empty-editor">
          <span class="empty-icon">◇</span>
          <p class="empty-text">No AGENTS.md files found in this repository.</p>
          <p class="empty-hint">Create an AGENTS.md file in your repo root to get started.</p>
        </div>
      {:else}
        <div class="editor-stack">
          <AgentMdTabs
            files={editorFiles}
            activeIndex={activeIndex}
            onselect={selectTab}
          />
          <div class="editor-body">
            {#if activeFile}
              <AgentMdEditor
                file={activeFile}
                organization={data.organization}
                repoName={data.repoName}
                {saving}
                {saveResult}
                onupdate={updateDraft}
                onsave={save}
                ondiscard={discardEdits}
              />
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Right: Context + Chat -->
    <div class="panel panel-right">
      <ContextFilesList
        files={contextFiles}
        onremove={removeContextFile}
      />
      <div class="chat-area">
        <ConfigAiChat
          organization={data.organization}
          repoName={data.repoName}
          {activeFile}
          {contextFiles}
        />
      </div>
    </div>
  </div>
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Page root                                                           */
  /* ------------------------------------------------------------------ */
  .config-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 10px;
    min-height: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Status bar                                                          */
  /* ------------------------------------------------------------------ */
  .status-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0;
    white-space: nowrap;
  }

  .status-chips {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .chip {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-dim);
  }

  .chip-ok {
    border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
    color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 8%, transparent);
  }

  .chip-dim {
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Three-panel layout                                                  */
  /* ------------------------------------------------------------------ */
  .panels {
    display: grid;
    grid-template-columns: 240px 1fr 280px;
    gap: 10px;
    flex: 1;
    min-height: 0;
    /* Fixed height so panels can scroll internally */
    height: calc(100vh - 160px);
  }

  @media (max-width: 900px) {
    .panels {
      grid-template-columns: 1fr;
      grid-template-rows: 220px 1fr 300px;
      height: auto;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Panels                                                              */
  /* ------------------------------------------------------------------ */
  .panel {
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .panel-tree {
    overflow: hidden;
  }

  .panel-editor {
    overflow: hidden;
  }

  .panel-right {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: hidden;
  }

  /* ------------------------------------------------------------------ */
  /* Editor stack                                                        */
  /* ------------------------------------------------------------------ */
  .editor-stack {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .editor-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* ------------------------------------------------------------------ */
  /* Empty editor state                                                  */
  /* ------------------------------------------------------------------ */
  .empty-editor {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 10px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
  }

  .empty-icon {
    font-size: 28px;
    color: var(--color-dim);
    line-height: 1;
  }

  .empty-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
    margin: 0;
    text-align: center;
  }

  .empty-hint {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    margin: 0;
    text-align: center;
  }

  /* ------------------------------------------------------------------ */
  /* Chat area fills remaining right panel space                         */
  /* ------------------------------------------------------------------ */
  .chat-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
