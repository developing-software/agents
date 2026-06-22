<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import Markdown from "$lib/ui/Markdown.svelte";
  import UnifiedDiff from "$lib/ui/UnifiedDiff.svelte";
  import {
    loadAgentPairContents,
    saveAgentConfigFiles,
    validateAgentConfigFiles,
  } from "$lib/features/agents/api/config.remote";

  type AgentPair = import("@agents/core/agent").AgentDiscovery.AgentPair;
  type ValidationResult = import("@agents/core/agent").AgentDiscovery.ValidationResult;
  type EditorMode = "write" | "preview" | "diff";

  let {
    open = $bindable(false),
    pair = null,
    organization,
    repoName,
    onupdated,
  }: {
    open?: boolean;
    pair: AgentPair | null;
    organization: string;
    repoName: string;
    onupdated?: () => Promise<void> | void;
  } = $props();

  let loading = $state(false);
  let saving = $state(false);
  let validating = $state(false);
  let error = $state<string | null>(null);
  let validation = $state<ValidationResult[]>([]);
  let agentsOriginal = $state("");
  let agentsDraft = $state("");
  let claudeOriginal = $state("");
  let claudeDraft = $state("");
  let agentsMode = $state<EditorMode>("write");
  let claudeMode = $state<EditorMode>("write");
  let loadedKey = $state<string | null>(null);

  const dirty = $derived(
    !!pair &&
      ((pair.agents.editable && agentsDraft !== agentsOriginal) ||
        (!!pair.claude?.editable && claudeDraft !== claudeOriginal)),
  );

  const editableFiles = $derived.by(() => {
    const files: Array<{ path: string; content: string }> = [];
    if (pair?.agents.editable) {
      files.push({ path: pair.agents.path, content: agentsDraft });
    }
    if (pair?.claude?.editable) {
      files.push({ path: pair.claude.path, content: claudeDraft });
    }
    return files;
  });

  function toDiffLines(source: string): string[] {
    return source === "" ? [] : source.split("\n");
  }

  function buildDiff(filePath: string, before: string, after: string): string {
    if (before === after) return "";
    const beforeLines = toDiffLines(before);
    const afterLines = toDiffLines(after);
    const oldStart = beforeLines.length > 0 ? 1 : 0;
    const newStart = afterLines.length > 0 ? 1 : 0;
    return [
      `diff --git a/${filePath} b/${filePath}`,
      `--- a/${filePath}`,
      `+++ b/${filePath}`,
      `@@ -${oldStart},${beforeLines.length} +${newStart},${afterLines.length} @@`,
      ...beforeLines.map((line) => `-${line}`),
      ...afterLines.map((line) => `+${line}`),
    ].join("\n");
  }

  function resetState() {
    error = null;
    validation = [];
    agentsOriginal = "";
    agentsDraft = "";
    claudeOriginal = "";
    claudeDraft = "";
    agentsMode = "write";
    claudeMode = "write";
    loadedKey = null;
  }

  async function loadPair(target: AgentPair) {
    loading = true;
    error = null;
    validation = [];
    try {
      const result = await loadAgentPairContents({
        organization,
        repoName,
        agentsPath: target.agents.path,
        claudePath: target.claude?.path ?? null,
      });
      agentsOriginal = result.agentsContent;
      agentsDraft = result.agentsContent;
      claudeOriginal = result.claudeContent;
      claudeDraft = result.claudeContent;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load config files";
    } finally {
      loading = false;
    }
  }

  function confirmDiscard(): boolean {
    if (!dirty) return true;
    return window.confirm("Discard unsaved config changes?");
  }

  function close() {
    if (saving || validating) return;
    if (!confirmDiscard()) return;
    open = false;
    resetState();
  }

  async function handleValidate() {
    if (editableFiles.length === 0 || validating) return;
    validating = true;
    error = null;
    try {
      validation = await validateAgentConfigFiles({
        organization,
        repoName,
        files: editableFiles,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to validate config files";
    } finally {
      validating = false;
    }
  }

  async function handleSave() {
    if (editableFiles.length === 0 || saving) return;
    saving = true;
    error = null;
    try {
      const result = await saveAgentConfigFiles({
        organization,
        repoName,
        files: editableFiles,
      });
      validation = result.validation;
      agentsOriginal = agentsDraft;
      claudeOriginal = claudeDraft;
      await onupdated?.();
      open = false;
      resetState();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to save config files";
    } finally {
      saving = false;
    }
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!open || !dirty) return;
    event.preventDefault();
    event.returnValue = "";
  }

  beforeNavigate((navigation) => {
    if (!open || !dirty) return;
    if (!window.confirm("Discard unsaved config changes?")) {
      navigation.cancel();
    }
  });

  $effect(() => {
    const nextKey = open && pair ? `${pair.agents.path}:${pair.claude?.path ?? ""}` : null;
    if (!nextKey || !pair || nextKey === loadedKey) return;
    loadedKey = nextKey;
    void loadPair(pair);
  });

  $effect(() => {
    if (!open) {
      resetState();
    }
  });
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

{#if open && pair}
  <div class="overlay" onclick={close} aria-hidden="true"></div>
  <div class="editor-shell" role="dialog" aria-modal="true" aria-label="Edit agent config">
    <header class="editor-header">
      <div class="header-copy">
        <span class="eyebrow">Agent Config</span>
        <h3>{pair.directory || "/"}</h3>
        <p>
          {pair.agents.path}
          {#if pair.claude}
            <span class="divider">|</span>
            {pair.claude.path}
          {/if}
        </p>
      </div>

      <div class="header-actions">
        <button type="button" class="ghost-btn" onclick={close} disabled={saving || validating}>
          Cancel
        </button>
        <button
          type="button"
          class="ghost-btn"
          onclick={handleValidate}
          disabled={saving || validating || editableFiles.length === 0}
        >
          {validating ? "Validating..." : "Validate"}
        </button>
        <button
          type="button"
          class="primary-btn"
          onclick={handleSave}
          disabled={saving || validating || editableFiles.length === 0}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </header>

    {#if error}
      <div class="message message-error">{error}</div>
    {/if}

    {#if validation.length > 0}
      <div class="validation-strip">
        {#each validation as result (result.path)}
          <div class="validation-card">
            <span class="validation-path">{result.path}</span>
            <span class:validation-ok={result.valid} class="validation-state">
              {result.valid ? "valid" : "issues"}
            </span>
            {#if result.issues.length > 0}
              <ul class="validation-list">
                {#each result.issues as issue, index (`${result.path}:${index}`)}
                  <li class:issue-error={issue.level === "error"}>{issue.message}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="panes">
      <section class="pane">
        <div class="pane-header">
          <div>
            <span class="pane-title">AGENTS.md</span>
            <span class="pane-path">{pair.agents.path}</span>
          </div>
          <div class="mode-tabs">
            <button type="button" class:tab-active={agentsMode === "write"} onclick={() => { agentsMode = "write"; }}>
              Write
            </button>
            <button type="button" class:tab-active={agentsMode === "preview"} onclick={() => { agentsMode = "preview"; }}>
              Preview
            </button>
            <button type="button" class:tab-active={agentsMode === "diff"} onclick={() => { agentsMode = "diff"; }}>
              Diff
            </button>
          </div>
        </div>

        {#if loading}
          <div class="pane-state">Loading AGENTS.md...</div>
        {:else if agentsMode === "write"}
          <textarea
            class="editor-input"
            bind:value={agentsDraft}
            spellcheck="false"
            readonly={!pair.agents.editable}
          ></textarea>
        {:else if agentsMode === "preview"}
          <div class="preview-surface">
            <Markdown source={agentsDraft} />
          </div>
        {:else}
          <div class="diff-surface">
            <UnifiedDiff diff={buildDiff(pair.agents.path, agentsOriginal, agentsDraft)} maxFiles={1} maxLines={500} />
          </div>
        {/if}
      </section>

      <section class="pane">
        <div class="pane-header">
          <div>
            <span class="pane-title">CLAUDE.md</span>
            <span class="pane-path">{pair.claude?.path ?? "Missing"}</span>
          </div>
          {#if pair.claude}
            <div class="mode-tabs">
              <button type="button" class:tab-active={claudeMode === "write"} onclick={() => { claudeMode = "write"; }}>
                Write
              </button>
              <button type="button" class:tab-active={claudeMode === "preview"} onclick={() => { claudeMode = "preview"; }}>
                Preview
              </button>
              <button type="button" class:tab-active={claudeMode === "diff"} onclick={() => { claudeMode = "diff"; }}>
                Diff
              </button>
            </div>
          {/if}
        </div>

        {#if !pair.claude}
          <div class="pane-state">
            CLAUDE.md is missing for this directory. Use the generate action on the config table to create it.
          </div>
        {:else if loading}
          <div class="pane-state">Loading CLAUDE.md...</div>
        {:else}
          {#if pair.claude.isSymlink}
            <div class="message message-note">
              This file is a symlink{#if pair.claude.resolvedPath} to {pair.claude.resolvedPath}{/if}. The pane is read-only.
            </div>
          {/if}

          {#if claudeMode === "write"}
            <textarea
              class="editor-input"
              bind:value={claudeDraft}
              spellcheck="false"
              readonly={!pair.claude.editable}
            ></textarea>
          {:else if claudeMode === "preview"}
            <div class="preview-surface">
              <Markdown source={claudeDraft} />
            </div>
          {:else}
            <div class="diff-surface">
              <UnifiedDiff diff={buildDiff(pair.claude.path, claudeOriginal, claudeDraft)} maxFiles={1} maxLines={500} />
            </div>
          {/if}
        {/if}
      </section>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.56);
    z-index: 100;
  }

  .editor-shell {
    position: fixed;
    inset: 24px;
    z-index: 101;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border: 1px solid var(--color-border-bright);
    border-radius: 6px;
    overflow: hidden;
  }

  .editor-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-elevated) 82%, transparent);
  }

  .header-copy h3 {
    margin: 4px 0 0;
    font-size: 16px;
    color: var(--color-text);
  }

  .header-copy p {
    margin: 6px 0 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .eyebrow {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-accent);
  }

  .divider {
    margin: 0 6px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ghost-btn,
  .primary-btn,
  .mode-tabs button {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    border-radius: 3px;
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s, color 0.1s;
  }

  .ghost-btn,
  .primary-btn {
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
  }

  .primary-btn {
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
    background: color-mix(in srgb, var(--color-accent) 18%, var(--color-elevated));
    color: var(--color-accent);
  }

  .ghost-btn:disabled,
  .primary-btn:disabled,
  .mode-tabs button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .message {
    margin: 12px 18px 0;
    padding: 8px 10px;
    border-radius: 4px;
    font-size: 12px;
  }

  .message-error {
    color: var(--color-danger);
    border: 1px solid color-mix(in srgb, var(--color-danger) 24%, transparent);
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  }

  .message-note {
    margin: 0 0 10px;
    color: var(--color-warning);
    border: 1px solid color-mix(in srgb, var(--color-warning) 22%, transparent);
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
  }

  .validation-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 10px;
    padding: 12px 18px 0;
  }

  .validation-card {
    padding: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    border-radius: 4px;
  }

  .validation-path,
  .validation-state,
  .validation-list {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }

  .validation-path {
    display: block;
    color: var(--color-muted);
  }

  .validation-state {
    display: inline-block;
    margin-top: 6px;
    color: var(--color-warning);
  }

  .validation-ok {
    color: var(--color-success);
  }

  .validation-list {
    margin: 8px 0 0;
    padding-left: 16px;
    color: var(--color-dim);
  }

  .issue-error {
    color: var(--color-danger);
  }

  .panes {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0;
    flex: 1;
    min-height: 0;
  }

  .pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    border-top: 1px solid var(--color-border);
  }

  .pane + .pane {
    border-left: 1px solid var(--color-border);
  }

  .pane-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
  }

  .pane-title,
  .pane-path {
    display: block;
    font-family: "JetBrains Mono", monospace;
  }

  .pane-title {
    font-size: 11px;
    color: var(--color-text);
  }

  .pane-path {
    margin-top: 4px;
    font-size: 10px;
    color: var(--color-dim);
  }

  .mode-tabs {
    display: inline-flex;
    gap: 4px;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .mode-tabs button {
    border: none;
    padding: 4px 8px;
    background: transparent;
    color: var(--color-dim);
  }

  .tab-active {
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
  }

  .editor-input,
  .preview-surface,
  .diff-surface,
  .pane-state {
    flex: 1;
    min-height: 0;
  }

  .editor-input {
    width: 100%;
    border: none;
    background: var(--color-surface);
    color: var(--color-text);
    padding: 14px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    resize: none;
    outline: none;
  }

  .editor-input[readonly] {
    color: var(--color-muted);
    background: color-mix(in srgb, var(--color-surface) 86%, var(--color-elevated));
  }

  .preview-surface,
  .diff-surface,
  .pane-state {
    overflow: auto;
    padding: 14px;
  }

  .pane-state {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 12px;
    color: var(--color-dim);
    line-height: 1.6;
  }

  @media (max-width: 980px) {
    .editor-shell {
      inset: 12px;
    }

    .editor-header {
      flex-direction: column;
    }

    .header-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .panes {
      grid-template-columns: 1fr;
    }

    .pane + .pane {
      border-left: none;
      border-top: 1px solid var(--color-border);
    }
  }
</style>
